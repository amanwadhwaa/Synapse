import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Trash2, Brain } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const GlobalChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const CHAT_HISTORY_KEY = "synapse_global_chat_history";
  const GREETING_MESSAGE: Message = {
    id: "greeting",
    role: "assistant",
    content: "Hi! I'm your SYNAPSE Assistant 👋 I can help you navigate SYNAPSE, answer study questions, or guide you through any feature. What would you like to know?",
    timestamp: Date.now(),
  };

  // Load chat history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Message[];
        setMessages(parsed);
      } catch {
        setMessages([GREETING_MESSAGE]);
      }
    } else {
      setMessages([GREETING_MESSAGE]);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  // Save messages to localStorage (limit to last 50)
  useEffect(() => {
    if (messages.length > 0) {
      const toStore = messages.slice(-50);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toStore));
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/chat/global", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = (await response.json()) as { reply: string };
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Set unread if not open
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.error("Global chat error:", error);
      toast.error("Failed to send message");
      // Remove the user message if request failed
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([GREETING_MESSAGE]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    toast.success("Chat cleared");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed top-4 right-4 z-50 h-12 w-12 rounded-full bg-[var(--color-primary)] hover:bg-blue-600 text-white shadow-lg border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {hasUnread && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-300 animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="fixed top-16 right-4 z-[60] w-96 h-[500px] rounded-2xl border border-white/20 bg-slate-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 scale-100 opacity-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[var(--color-primary)]/20 rounded-lg">
                <Brain className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <span className="font-semibold text-white text-sm">SYNAPSE Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white/10 border border-white/15 text-gray-200"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm text-gray-200 [&_strong]:font-bold">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/15 rounded-lg px-3 py-2 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-300/70 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-blue-300/70 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-blue-300/70 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-slate-800/50 p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                disabled={isSending}
              />
              <button
                type="button"
                onClick={() => {
                  void handleSendMessage();
                }}
                disabled={!input.trim() || isSending}
                className="p-2 rounded-lg bg-[var(--color-primary)] hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              SYNAPSE is AI and can make mistakes. Please double-check responses.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalChatbot;
