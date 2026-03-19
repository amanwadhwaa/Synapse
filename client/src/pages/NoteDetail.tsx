import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Brain,
  BookOpen,
  Calendar,
  Tag,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  simplifyNote,
  summarizeNote,
  generateQuiz,
  chatWithNote,
} from "../services/aiService";
import type { ChatMessagePayload } from "../services/aiService";

interface Note {
  id: string;
  userId: string;
  subjectId?: string;
  subject?: { name: string };
  rawText: string;
  extractedText?: string;
  sourceType: "TYPED" | "IMAGE" | "AUDIO";
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
}

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [processingAI, setProcessingAI] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi! I'm ready to help you understand these notes. What would you like to know?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (id) {
      fetchNote();
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
    };

    const historyForRequest: ChatMessagePayload[] = chatMessages.map(
      ({ role, content }) => ({ role, content }),
    );

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    try {
      const response = await chatWithNote(id, trimmedMessage, historyForRequest);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.result,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to get AI response");
    } finally {
      setIsChatting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-white mb-4">Note not found</h1>
          <button
            onClick={() => navigate("/notes")}
            className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-3 rounded-xl transition-all duration-300"
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
          className="flex items-center space-x-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Notes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-6">
          {/* Note Header */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 text-violet-400">
                {getSourceIcon(note.sourceType)}
                <div>
                  <span className="text-xs uppercase tracking-widest text-neutral-500">
                    {note.sourceType}
                  </span>
                  {note.subject && (
                    <div className="flex items-center space-x-1 text-sm text-neutral-400 mt-1">
                      <Tag className="h-4 w-4" />
                      <span>{note.subject.name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center text-sm text-neutral-600">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(note.createdAt)}</span>
              </div>
            </div>

            {/* AI Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleAIAction("simplify")}
                disabled={processingAI === "simplify"}
                className="flex items-center space-x-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-violet-500/20 hover:border-violet-500/40"
              >
                {processingAI === "simplify" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-300"></div>
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Simplify This</span>
              </button>

              <button
                onClick={() => handleAIAction("summarize")}
                disabled={processingAI === "summarize"}
                className="flex items-center space-x-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/20 hover:border-cyan-500/40"
              >
                {processingAI === "summarize" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-300"></div>
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                <span>Summarize</span>
              </button>

              <button
                onClick={() => handleAIAction("quiz")}
                disabled={processingAI === "quiz"}
                className="flex items-center space-x-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20 hover:border-emerald-500/40"
              >
                {processingAI === "quiz" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-300"></div>
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                <span>Generate Quiz</span>
              </button>
            </div>
          </div>

          {/* Note Content */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-serif text-2xl text-white mb-4">Note Content</h2>
            <div className="prose prose-invert max-w-none">
              <pre className="text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans text-sm">
                {note.rawText}
              </pre>
            </div>
          </div>

          {/* AI Responses */}
          {aiResponses.length > 0 && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl text-white">AI Responses</h2>
              {aiResponses.map((response, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-violet-400">{getAIActionIcon(response.type)}</span>
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {response.type}
                    </h3>
                    <span className="text-sm text-neutral-600">
                      {response.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <pre className="text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans text-sm">
                      {response.content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:col-span-2">
          <div className="glass rounded-2xl h-[70vh] lg:sticky lg:top-6 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center space-x-3">
              <div className="relative">
                <Brain className="h-5 w-5 text-violet-400" />
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-violet-400 animate-pulse"></div>
              </div>
              <h2 className="font-serif text-lg text-white">Ask SYNAPSE</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                        : "bg-[#0a0a0a] border border-white/10 text-neutral-200"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-3 inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-violet-400/70 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 rounded-full bg-violet-400/70 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 rounded-full bg-violet-400/70 animate-bounce"></span>
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
                  className="flex-1 rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder:text-neutral-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition"
                  disabled={isChatting}
                />
                <button
                  onClick={() => {
                    void handleSendMessage();
                  }}
                  disabled={isChatting || !chatInput.trim()}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default NoteDetail;
