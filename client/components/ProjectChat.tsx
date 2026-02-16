import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, X, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getRealtimeSocket } from "@/lib/realtimeSocket";

interface ChatMessage {
  id: number;
  projectId: number;
  authorId: number;
  body: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
}

interface ProjectChatProps {
  projectId: number;
  projectName: string;
}

const AVATAR_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${time}`;
}

export default function ProjectChat({ projectId, projectName }: ProjectChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/api/projects/${projectId}/chat?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (open) {
      fetchMessages();
      setUnread(0);
    }
  }, [open, fetchMessages]);

  // Real-time messages via socket
  useEffect(() => {
    const socket = getRealtimeSocket();
    socket.emit("join-project", { projectId });

    const onMessage = ({ message }: { message: ChatMessage }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (!open) {
        setUnread((u) => u + 1);
      }
      scrollToBottom();
    };

    socket.on("chat:message", onMessage);

    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [projectId, open, scrollToBottom]);

  // Scroll to bottom when messages change and panel is open
  useEffect(() => {
    if (open && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, open, scrollToBottom]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleSend = async () => {
    const body = inputValue.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      const res = await api(`/api/projects/${projectId}/chat`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setInputValue("");
        // Message will arrive via socket
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group consecutive messages from same author
  const shouldShowAvatar = (msg: ChatMessage, idx: number) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    return prev.authorId !== msg.authorId ||
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
  };

  return (
    <>
      {/* Toggle button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2"
      >
        <MessageCircle className="w-4 h-4 text-indigo-500" />
        Chat
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-0 right-6 z-50 w-96 h-[520px] bg-card border border-border rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ y: 520, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 520, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex-shrink-0">
              <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Team Chat</p>
                    <p className="text-[10px] text-muted-foreground">{projectName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto px-4 py-3 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.authorId === user?.id;
                  const showAvatar = shouldShowAvatar(msg, idx);

                  return (
                    <div key={msg.id}>
                      {/* Author header */}
                      {showAvatar && (
                        <div className={`flex items-center gap-2 mt-3 mb-1 ${isMe ? "justify-end" : ""}`}>
                          {!isMe && (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(msg.authorId) }}
                            >
                              {msg.author.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {isMe ? "You" : msg.author.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary/60 text-foreground rounded-bl-md"
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm bg-secondary/50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
