"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi! I'm Mindy's assistant. Ask me about her work, projects, or background.";

const SUGGESTIONS = [
  "What does Mindy do?",
  "Tell me about her projects",
  "What's she looking for?",
];

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.ok
            ? data.reply
            : data.error || "Something went wrong. Please try again.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Couldn't reach the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask about Mindy"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 60,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          backgroundColor: "var(--navy)",
          color: "#FFFFFF",
          boxShadow: "0 6px 20px rgba(30, 43, 34, 0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Ask about Mindy"
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            zIndex: 60,
            width: "min(380px, calc(100vw - 48px))",
            height: "min(540px, calc(100vh - 140px))",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(30, 43, 34, 0.20)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--cream)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: 15,
                color: "var(--navy)",
              }}
            >
              Ask about Mindy
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              answers from an AI, not Mindy herself
            </p>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Bubble role="assistant">{GREETING}</Bubble>

            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                      color: "var(--blue-mid)",
                      backgroundColor: "var(--blue-pale)",
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "5px 12px",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.content}
              </Bubble>
            ))}

            {loading && (
              <Bubble role="assistant">
                <span style={{ color: "var(--text-tertiary)" }}>thinking…</span>
              </Bubble>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={{
              display: "flex",
              gap: 8,
              padding: 12,
              borderTop: "1px solid var(--border)",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={1000}
              aria-label="Your question"
              style={{
                flex: 1,
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--text-primary)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "9px 12px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              style={{
                width: 40,
                borderRadius: 8,
                border: "none",
                cursor: loading || !input.trim() ? "default" : "pointer",
                backgroundColor: "var(--navy)",
                color: "#FFFFFF",
                opacity: loading || !input.trim() ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        lineHeight: 1.5,
        color: isUser ? "#FFFFFF" : "var(--text-primary)",
        backgroundColor: isUser ? "var(--navy)" : "var(--blue-pale)",
        border: isUser ? "none" : "1px solid var(--border)",
        borderRadius: 12,
        padding: "9px 13px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {children}
    </div>
  );
}
