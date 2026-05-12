import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─── API Helper ───────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── Suggested Questions ─────────────────────────────────────────────────────

const SUGGESTIONS = [
  "كيف أبدأ أول بحث عن عملاء؟",
  "How do I run my first agent search?",
  "What does the lead score mean?",
  "كيف أحسن إيميلات الـ outreach؟",
];

// ─── Typing Dots ─────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
          style={{
            animation: `typingBounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
          isUser
            ? "bg-brand text-brand-fg brand-glow"
            : "glass-sm border border-[var(--glass-border-strong)]"
        )}
        style={
          isUser
            ? { background: "linear-gradient(135deg, var(--brand), #F97316)" }
            : {}
        }
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "rounded-br-sm text-white"
            : "rounded-bl-sm glass-sm"
        )}
        style={
          isUser
            ? {
                background: "linear-gradient(135deg, var(--brand) 0%, #F97316 100%)",
                boxShadow: "0 2px 12px var(--brand-glow)",
              }
            : {
                color: "var(--text)",
                border: "1px solid var(--glass-border)",
              }
        }
      >
        {msg.streaming && msg.content === "" ? (
          <TypingDots />
        ) : (
          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {msg.content}
            {msg.streaming && (
              <span
                className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
                style={{
                  background: isUser ? "rgba(255,255,255,0.8)" : "var(--brand)",
                  animation: "blinkCursor 1s step-end infinite",
                }}
              />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [location] = useLocation();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Show/hide scroll button
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 100);
  };

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => scrollToBottom(false), 50);
      inputRef.current?.focus();
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "👋 مرحباً! أنا FindX Assistant.\n\nأنا هنا لمساعدتك في الاستفادة القصوى من المنصة — من البحث عن العملاء إلى تحليل النتائج وكتابة الإيميلات.\n\nكيف يمكنني مساعدتك اليوم؟",
        },
      ]);
    }
  }, [messages.length]);

  // Page context for AI
  const buildContext = (): string => {
    const path = location;
    const routeMap: Record<string, string> = {
      "/": "Dashboard — overview of stats and recent activity",
      "/leads": "Leads page — list of discovered businesses",
      "/pipeline": "Pipeline page — Kanban board (New/Qualified/Won)",
      "/agents": "Agents page — run AI pipeline to discover new leads",
      "/settings": "Settings page — configure API keys, AI providers, email",
    };
    const page = Object.entries(routeMap).find(([r]) =>
      path === r || path.startsWith(r + "/")
    );
    return page ? `User is currently on: ${page[1]}` : `User is on: ${path}`;
  };

  // Send message
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    // Build history (exclude welcome + current streaming)
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const token = await getAuthToken();
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history,
          context: buildContext(),
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `❌ ${err.error || "Something went wrong"}`, streaming: false }
              : m
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, streaming: false } : m
              )
            );
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `❌ ${parsed.error}`, streaming: false }
                    : m
                )
              );
            } else if (parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.text }
                    : m
                )
              );
              // Notify if chat is closed
              if (!open) setUnread((n) => n + 1);
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "❌ Connection error. Please try again.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const stopStream = () => {
    abortRef.current?.abort();
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
    setIsLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes chatPop {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .chat-pop { animation: chatPop 280ms cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* ── FAB Button ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI Assistant"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          open ? "scale-90" : "hover:scale-105 active:scale-95"
        )}
        style={{
          background: open
            ? "var(--glass-raised)"
            : "linear-gradient(135deg, var(--brand) 0%, #F97316 100%)",
          border: open ? "1px solid var(--glass-border-strong)" : "none",
          boxShadow: open
            ? "0 4px 24px rgba(0,0,0,0.15)"
            : "0 4px 24px var(--brand-glow), 0 0 0 4px var(--brand-subtle)",
          backdropFilter: open ? "var(--blur-glass)" : "none",
          WebkitBackdropFilter: open ? "var(--blur-glass)" : "none",
        }}
      >
        {/* Pulse ring when closed */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "var(--brand)",
              opacity: 0,
              animation: "pulse-ring 2.5s ease-out infinite",
            }}
          />
        )}

        {/* Icon */}
        {open ? (
          <X className="w-5 h-5" style={{ color: "var(--text)" }} />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}

        {/* Unread badge */}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: "#EF4444", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="chat-pop fixed bottom-24 right-6 z-50 flex flex-col"
          style={{
            width: "min(400px, calc(100vw - 32px))",
            height: "min(560px, calc(100vh - 120px))",
            background: "var(--glass-overlay)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid var(--glass-border-strong)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: `
              0 24px 80px rgba(0,0,0,0.20),
              0 0 0 1px rgba(255,255,255,0.08),
              inset 0 1px 0 rgba(255,255,255,0.12)
            `,
            overflow: "hidden",
          }}
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
            style={{
              borderBottom: "1px solid var(--glass-border)",
              background: "var(--glass-raised)",
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--brand) 0%, #F97316 100%)",
                boxShadow: "0 2px 12px var(--brand-glow)",
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                FindX Assistant
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="pulse-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#10B981" }}
                />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  AI • Always online
                </span>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: "var(--glass)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-muted)",
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Messages ──────────────────────────────────────────────────── */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ scrollbarWidth: "thin", scrollbarColor: "var(--glass-border) transparent" }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Suggestions (only if just welcome msg) */}
            {messages.length === 1 && !isLoading && (
              <div className="mt-3 space-y-1.5 animate-fade-in">
                <p className="text-[11px] font-medium px-1" style={{ color: "var(--text-subtle)" }}>
                  اقتراحات سريعة
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-[12px] px-3 py-2 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: "var(--glass)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-muted)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,158,11,0.35)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--glass-border)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute left-1/2 -translate-x-1/2 bottom-20 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-105 animate-fade-in"
              style={{
                background: "var(--glass-raised)",
                border: "1px solid var(--glass-border-strong)",
                color: "var(--text-muted)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              }}
            >
              <ChevronDown className="w-3 h-3" />
              Scroll down
            </button>
          )}

          {/* ── Input ─────────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 px-3 py-3"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            <div
              className="flex items-end gap-2 rounded-2xl px-3 py-2 transition-all"
              style={{
                background: "var(--glass)",
                border: "1px solid var(--glass-border-strong)",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--brand)";
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 0 0 3px rgba(245,158,11,0.15)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--glass-border-strong)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="اكتب سؤالك هنا... / Type your question..."
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] leading-relaxed disabled:opacity-50"
                style={{
                  color: "var(--text)",
                  fontFamily: "var(--font-sans)",
                  minHeight: "22px",
                  maxHeight: "120px",
                  scrollbarWidth: "none",
                }}
              />

              {/* Send / Stop button */}
              <button
                onClick={() => (isLoading ? stopStream() : sendMessage(input))}
                disabled={!isLoading && !input.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={
                  isLoading || input.trim()
                    ? {
                        background: isLoading
                          ? "var(--danger-bg, rgba(239,68,68,0.12))"
                          : "linear-gradient(135deg, var(--brand) 0%, #F97316 100%)",
                        boxShadow: isLoading
                          ? "none"
                          : "0 2px 8px var(--brand-glow)",
                        color: isLoading ? "#EF4444" : "white",
                      }
                    : {
                        background: "var(--glass)",
                        color: "var(--text-subtle)",
                      }
                }
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <p className="text-center text-[10px] mt-2" style={{ color: "var(--text-subtle)" }}>
              Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}
