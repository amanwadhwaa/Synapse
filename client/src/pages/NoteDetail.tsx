import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  File as FileIcon,
  Brain,
  BookOpen,
  Calendar,
  Volume2,
  Play,
  Pause,
  Square,
  RotateCcw,
  Tag,
  Send,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  simplifyNote,
  summarizeNote,
  generateQuiz,
  generateAudioLecture,
  chatWithNote,
  getChatHistory,
  clearChatHistory,
} from "../services/aiService";

interface Note {
  id: string;
  userId: string;
  subjectId?: string;
  subject?: { name: string };
  rawText: string;
  extractedText?: string;
  sourceType: "TYPED" | "IMAGE" | "AUDIO" | "PDF" | "VOICE";
  fileUrl?: string;
  audioLectureUrl?: string | null;
  audioLectureLanguage?: string | null;
  createdAt: string;
  title?: string;
}

interface AIResponse {
  type: "simplify" | "summarize" | "quiz";
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

const aiDisclaimerText =
  "SYNAPSE is AI and can make mistakes. Please double-check responses.";

const aiDisclaimerClassName =
  "mt-2 text-center text-xs text-gray-500";

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [processingAI, setProcessingAI] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatPreferredLanguage, setChatPreferredLanguage] = useState("English");
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "good" | "bad" | null>>({});
  const [simplifyLevel, setSimplifyLevel] = useState(3);
  const [isGeneratingLecture, setIsGeneratingLecture] = useState(false);
  const [lectureAudioUrl, setLectureAudioUrl] = useState<string | null>(null);
  const [lectureLanguage, setLectureLanguage] = useState("English");
  const [lectureFallbackNote, setLectureFallbackNote] = useState<string | null>(null);
  const [lectureErrorMessage, setLectureErrorMessage] = useState<string | null>(null);
  const [isLecturePlaying, setIsLecturePlaying] = useState(false);
  const [lectureCurrentTime, setLectureCurrentTime] = useState(0);
  const [lectureDuration, setLectureDuration] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const lectureAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (id) {
      fetchNote();
      void fetchChatHistory(id);
    }
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  useEffect(() => {
    setLectureAudioUrl(note?.audioLectureUrl || null);
    setLectureLanguage(note?.audioLectureLanguage || "English");
  }, [note?.audioLectureUrl, note?.audioLectureLanguage]);

  useEffect(() => {
    return () => {
      if (lectureAudioRef.current) {
        lectureAudioRef.current.pause();
      }
    };
  }, []);

  const fetchNote = async () => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNote(data);
      } else if (response.status === 404) {
        toast.error("Note not found");
        navigate("/notes");
      } else {
        toast.error("Failed to fetch note");
      }
    } catch (error) {
      toast.error("Failed to fetch note");
    } finally {
      setLoading(false);
    }
  };

  const handleAIAction = async (action: "simplify" | "summarize" | "quiz") => {
    if (!note) return;

    setProcessingAI(action);

    try {
      let response: { result: string } | null = null;

      if (action === "simplify") {
        response = await simplifyNote(note.id, note.rawText, simplifyLevel);
      }

      if (action === "summarize") {
        response = await summarizeNote(note.id, note.rawText, simplifyLevel);
      }

      if (action === "quiz") {
        await generateQuiz(note.id, note.rawText, simplifyLevel);
        toast.success("Quiz generated! Find it in the Quizzes section");
        navigate("/quizzes");
        return;
      }

      if (!response) {
        throw new Error("No AI response");
      }

      const newResponse: AIResponse = {
        type: action,
        content: response.result,
        timestamp: new Date(),
      };

      setAiResponses((prev) => [newResponse, ...prev]);

      toast.success(
        `${action.charAt(0).toUpperCase() + action.slice(1)} completed!`,
      );
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} note`);
    } finally {
      setProcessingAI(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "TYPED":
        return <FileText className="h-5 w-5" />;
      case "IMAGE":
        return <BookOpen className="h-5 w-5" />;
      case "AUDIO":
      case "VOICE":
        return <BookOpen className="h-5 w-5" />;
      case "PDF":
        return <FileIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getLevelLabel = (level: number) => {
    const labels = {
      1: "5 Year Old",
      2: "Middle School",
      3: "High School",
      4: "University",
      5: "PhD Graduate"
    };
    return labels[level as keyof typeof labels] || "High School";
  };

  const getAIActionIcon = (action: string) => {
    switch (action) {
      case "simplify":
        return <Sparkles className="h-4 w-4" />;
      case "summarize":
        return <Brain className="h-4 w-4" />;
      case "quiz":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const handleSendMessage = async () => {
    if (!note || !id) return;

    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage || isChatting) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedMessage,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    try {
      const response = await chatWithNote(
        id,
        trimmedMessage,
        chatPreferredLanguage,
      );

      if (response?.assistantMessage) {
        setChatMessages((prev) => [
          ...prev.filter((msg) => msg.id !== userMessage.id),
          response.userMessage,
          response.assistantMessage,
        ]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to get AI response");
      setChatMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setIsChatting(false);
    }
  };

  const fetchChatHistory = async (noteId: string) => {
    setLoadingChatHistory(true);
    try {
      const response = await getChatHistory(noteId);
      setChatMessages(response.messages || []);
      setChatPreferredLanguage(response.preferredLanguage || "English");
    } catch (error) {
      console.error(error);
      toast.error("Failed to load chat history");
    } finally {
      setLoadingChatHistory(false);
    }
  };

  const handleClearChat = async () => {
    if (!id || clearingChat) return;

    setClearingChat(true);
    try {
      await clearChatHistory(id);
      setChatMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear chat");
    } finally {
      setClearingChat(false);
    }
  };

  const formatChatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy message", { position: "top-right" });
    }
  };

  const handleFeedback = (messageId: string, feedback: "good" | "bad") => {
    setFeedbackMap((prev) => {
      const current = prev[messageId] || null;
      if (current === feedback) {
        return {
          ...prev,
          [messageId]: null,
        };
      }

      toast.success("We got your feedback", { position: "top-right" });
      return {
        ...prev,
        [messageId]: feedback,
      };
    });
  };

  const handleDeleteNote = async () => {
    if (!id || deletingNote) return;

    setDeletingNote(true);
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete note");
      }

      toast.success("Note deleted successfully");
      navigate("/notes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete note";
      toast.error(message);
      setDeletingNote(false);
    }
  };

  const stopLecturePlayback = () => {
    const audio = lectureAudioRef.current;
    if (!audio) {
      setIsLecturePlaying(false);
      setLectureCurrentTime(0);
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setIsLecturePlaying(false);
    setLectureCurrentTime(0);
  };

  const requestAudioLecture = async (forceRegenerate: boolean = false) => {
    if (!id || !note) {
      return;
    }

    if (isLecturePlaying) {
      stopLecturePlayback();
      forceRegenerate = true;
    }

    setIsGeneratingLecture(true);
    setLectureErrorMessage(null);
    setLectureFallbackNote(null);

    try {
      const response = await generateAudioLecture(id, forceRegenerate);
      console.log("Audio lecture URL:", response.audioUrl);
      setLectureAudioUrl(response.audioUrl);
      setLectureLanguage(response.lectureLanguage || "English");
      setLectureFallbackNote(response.fallbackToEnglish ? (response.fallbackNote || "Audio delivered in English (preferred language voice unavailable)") : null);
      setLectureCurrentTime(0);
      setLectureDuration(0);
      setIsLecturePlaying(false);
      setNote((prev) =>
        prev
          ? {
              ...prev,
              audioLectureUrl: response.audioUrl,
              audioLectureLanguage: response.lectureLanguage || "English",
            }
          : prev,
      );
      toast.success("Audio lecture ready");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate audio lecture";

      if (errorMessage.includes("lecture script")) {
        toast.error("Failed to generate lecture script");
        setLectureErrorMessage("Failed to generate lecture script");
      } else if (errorMessage.includes("convert script to audio")) {
        toast.error("Failed to convert script to audio");
        setLectureErrorMessage("Failed to convert script to audio");
      } else {
        toast.error(errorMessage);
        setLectureErrorMessage(errorMessage);
      }
    } finally {
      setIsGeneratingLecture(false);
    }
  };

  const toggleLecturePlayback = async () => {
    const audio = lectureAudioRef.current;
    if (!audio) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      toast.error("Unable to play lecture audio");
    }
  };

  const formatLectureTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "00:00";
    }

    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = (total % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Note not found</h1>
          <button
            onClick={() => navigate("/notes")}
            className="bg-[var(--color-primary)] hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/notes")}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Notes</span>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-6">
          {/* Note Header */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getSourceIcon(note.sourceType)}
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {note.sourceType}
                  </span>
                  {note.subject && (
                    <div className="flex items-center space-x-1 text-sm text-gray-400 mt-1">
                      <Tag className="h-4 w-4" />
                      <span>{note.subject.name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(note.createdAt)}</span>
              </div>
            </div>

            {note.sourceType === "VOICE" && (
              <p className="mb-4 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                This note was recorded in another language and translated to English
              </p>
            )}

            {/* AI Actions */}
            <div className="space-y-4">
              {/* Simplify Level Slider */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Tone</label>
                  <span className="text-sm text-purple-300 font-semibold">{getLevelLabel(simplifyLevel)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={simplifyLevel}
                  onChange={(e) => setSimplifyLevel(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(simplifyLevel - 1) * 25}%, #374151 ${(simplifyLevel - 1) * 25}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1: 5 Year Old</span>
                  <span>2: Middle School</span>
                  <span>3: High School</span>
                  <span>4: University</span>
                  <span>5: PhD</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleAIAction("simplify")}
                disabled={processingAI === "simplify"}
                className="flex items-center space-x-2 border border-white/20 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAI === "simplify" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Simplify This</span>
              </button>

              <button
                onClick={() => handleAIAction("summarize")}
                disabled={processingAI === "summarize"}
                className="flex items-center space-x-2 border border-white/20 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAI === "summarize" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                <span>Summarize</span>
              </button>

              <button
                onClick={() => handleAIAction("quiz")}
                disabled={processingAI === "quiz"}
                className="flex items-center space-x-2 border border-white/20 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAI === "quiz" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                <span>Generate Quiz</span>
              </button>

              <button
                onClick={() => {
                  void requestAudioLecture();
                }}
                disabled={isGeneratingLecture}
                className="flex items-center space-x-2 border border-white/20 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingLecture ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span>{isGeneratingLecture ? "Generating lecture..." : "Audio Lecture"}</span>
              </button>
            </div>

            {lectureAudioUrl && !isGeneratingLecture && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-blue-200">
                    🎓 Tutor Lecture — {note.title || "Untitled Note"} · {lectureLanguage}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void requestAudioLecture(true);
                    }}
                    disabled={isGeneratingLecture}
                    className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                </div>

                <audio
                  ref={lectureAudioRef}
                  preload="metadata"
                  className="hidden"
                  onError={(event) => {
                    console.error("Audio error:", event, lectureAudioUrl);
                    toast.error("Unable to play lecture audio");
                  }}
                  onLoadedMetadata={(event) => {
                    setLectureDuration(event.currentTarget.duration || 0);
                  }}
                  onTimeUpdate={(event) => {
                    setLectureCurrentTime(event.currentTarget.currentTime || 0);
                  }}
                  onPlay={() => setIsLecturePlaying(true)}
                  onPause={() => setIsLecturePlaying(false)}
                  onEnded={() => {
                    setIsLecturePlaying(false);
                    setLectureCurrentTime(0);
                  }}
                >
                  <source src={lectureAudioUrl} type="audio/mpeg" />
                </audio>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void toggleLecturePlayback();
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    {isLecturePlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isLecturePlaying ? "Pause" : "Play"}
                  </button>

                  <div className="flex min-w-[240px] flex-1 items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatLectureTime(lectureCurrentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={lectureDuration || 0}
                      step={0.1}
                      value={lectureCurrentTime}
                      onChange={(event) => {
                        const nextTime = Number(event.target.value);
                        setLectureCurrentTime(nextTime);
                        if (lectureAudioRef.current) {
                          lectureAudioRef.current.currentTime = nextTime;
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400">
                      {formatLectureTime(lectureDuration)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={stopLecturePlayback}
                    className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                </div>

                {lectureFallbackNote && (
                  <p className="mt-3 text-xs text-gray-400">{lectureFallbackNote}</p>
                )}
              </div>
            )}

            {lectureErrorMessage && !isGeneratingLecture && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-200">{lectureErrorMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    void requestAudioLecture();
                  }}
                  className="mt-2 rounded-md border border-red-300/30 px-2 py-1 text-xs text-red-100 hover:bg-red-500/20"
                >
                  Retry
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Note Content */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Note Content</h2>
            <div
              className="text-gray-300 leading-relaxed [&_strong]:font-bold [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-white/10 [&_code]:font-mono [&_code]:text-[13px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-white/20 [&_th]:bg-white/10 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2"
            >
              <ReactMarkdown>{note.rawText}</ReactMarkdown>
            </div>
          </div>

          {/* AI Responses */}
          {aiResponses.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">AI Responses</h2>
              {aiResponses.map((response, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    {getAIActionIcon(response.type)}
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {response.type}
                    </h3>
                    <span className="text-sm text-gray-400">
                      {response.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-200 [&_strong]:font-bold [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-white/10 [&_code]:font-mono [&_code]:text-[13px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-white/20 [&_th]:bg-white/10 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2">
                    <ReactMarkdown>{response.content}</ReactMarkdown>
                  </div>
                  {(response.type === "simplify" || response.type === "summarize") && (
                    <p className={aiDisclaimerClassName}>{aiDisclaimerText}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl h-[70vh] lg:sticky lg:top-6 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Brain className="h-5 w-5 text-[var(--color-primary)]" />
                  <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
                </div>
                <h2 className="text-lg font-semibold text-white">Ask SYNAPSE</h2>
              </div>
              <button
                onClick={() => {
                  void handleClearChat();
                }}
                disabled={clearingChat || isChatting}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingChat ? "Clearing..." : "Clear Chat"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingChatHistory && (
                <div className="text-center text-sm text-gray-400">Loading chat history...</div>
              )}

              {!loadingChatHistory && chatMessages.length === 0 && (
                <div className="text-center text-sm text-gray-400">
                  Ask your first question about this note.
                </div>
              )}

              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                        : "bg-slate-900/80 border border-white/10 text-gray-200"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <>
                        <div
                          className="text-gray-200 [&_strong]:font-bold [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-white/10 [&_code]:font-mono [&_code]:text-[13px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-white/20 [&_th]:bg-white/10 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1"
                        >
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              void handleCopyMessage(message.id, message.content);
                            }}
                            className="text-gray-400 transition-colors hover:text-white"
                            aria-label="Copy message"
                          >
                            {copiedId === message.id ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3.5 w-3.5 text-green-400"
                              >
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3.5 w-3.5"
                              >
                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                <rect x="4" y="4" width="11" height="11" rx="2" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(message.id, "good")}
                            className={
                              feedbackMap[message.id] === "good"
                                ? "text-green-400"
                                : "text-gray-400 transition-colors hover:text-green-400"
                            }
                            aria-label="Mark response as helpful"
                          >
                            {feedbackMap[message.id] === "good" ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-3.5 w-3.5 fill-green-400"
                              >
                                <path d="M7 10v10H3V10h4Zm2 10h7.2a2 2 0 0 0 1.96-1.6l1.2-6A2 2 0 0 0 17.4 10H14V6.5A2.5 2.5 0 0 0 11.5 4L9 10v10Z" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-3.5 w-3.5"
                              >
                                <path d="M7 10v10H3V10h4Zm2 10h7.2a2 2 0 0 0 1.96-1.6l1.2-6A2 2 0 0 0 17.4 10H14V6.5A2.5 2.5 0 0 0 11.5 4L9 10v10Z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(message.id, "bad")}
                            className={
                              feedbackMap[message.id] === "bad"
                                ? "text-red-400"
                                : "text-gray-400 transition-colors hover:text-red-400"
                            }
                            aria-label="Mark response as unhelpful"
                          >
                            {feedbackMap[message.id] === "bad" ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-3.5 w-3.5 fill-red-400"
                              >
                                <path d="M7 4v10H3V4h4Zm2 0h7.2a2 2 0 0 1 1.96 1.6l1.2 6A2 2 0 0 1 17.4 14H14v3.5A2.5 2.5 0 0 1 11.5 20L9 14V4Z" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-3.5 w-3.5"
                              >
                                <path d="M7 4v10H3V4h4Zm2 0h7.2a2 2 0 0 1 1.96 1.6l1.2 6A2 2 0 0 1 17.4 14H14v3.5A2.5 2.5 0 0 1 11.5 20L9 14V4Z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.createdAt && (
                      <p
                        className={`mt-1.5 text-[11px] ${
                          message.role === "user"
                            ? "text-white/75"
                            : "text-gray-400"
                        }`}
                      >
                        {formatChatTimestamp(message.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-300/70 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 rounded-full bg-blue-300/70 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 rounded-full bg-blue-300/70 animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="p-4 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Ask about this note..."
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-white placeholder:text-white/50 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                  disabled={isChatting}
                />
                <button
                  onClick={() => {
                    void handleSendMessage();
                  }}
                  disabled={isChatting || !chatInput.trim()}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className={aiDisclaimerClassName}>{aiDisclaimerText}</p>
            </div>
          </div>
        </aside>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Delete Note</h3>
            <p className="text-sm text-gray-300 mb-6">
              Are you sure you want to delete this note? This will also delete all quizzes and chat history associated with it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingNote}
                className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteNote();
                }}
                disabled={deletingNote}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deletingNote ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteDetail;
