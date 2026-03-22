import ReactMarkdown from "react-markdown";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  File as FileIcon,
  Brain,
  BookOpen,
  Calendar,
  Tag,
  Send,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  simplifyNote,
  summarizeNote,
  generateQuiz,
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
  sourceType: "TYPED" | "IMAGE" | "AUDIO" | "PDF";
  fileUrl?: string;
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

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [processingAI, setProcessingAI] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (id) {
      fetchNote();
      void fetchChatHistory(id);
    }
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

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
        response = await simplifyNote(note.id, note.rawText);
      }

      if (action === "summarize") {
        response = await summarizeNote(note.id, note.rawText);
      }

      if (action === "quiz") {
        await generateQuiz(note.id, note.rawText);
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
        return <BookOpen className="h-5 w-5" />;
      case "PDF":
        return <FileIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
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
      const response = await chatWithNote(id, trimmedMessage);

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

            {/* AI Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleAIAction("simplify")}
                disabled={processingAI === "simplify"}
                className="flex items-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAI === "simplify" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-300"></div>
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Simplify This</span>
              </button>

              <button
                onClick={() => handleAIAction("summarize")}
                disabled={processingAI === "summarize"}
                className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex items-center space-x-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAI === "quiz" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-300"></div>
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                <span>Generate Quiz</span>
              </button>
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
                  <div className="prose prose-invert max-w-none">
                    <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {response.content}
                    </pre>
                  </div>
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
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                        : "bg-slate-900/80 border border-white/10 text-gray-200"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div
                        className="text-gray-200 [&_strong]:font-bold [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-white/10 [&_code]:font-mono [&_code]:text-[13px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-white/20 [&_th]:bg-white/10 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1"
                      >
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
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

            <div className="p-4 border-t border-white/10">
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
