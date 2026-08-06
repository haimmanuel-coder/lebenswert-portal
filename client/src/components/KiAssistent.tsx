import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AVATAR_EMOJI = "🤖";
const LENA_NAME = "LENA";
const LENA_COLOR = "#4a8c3f";

const QUICK_QUESTIONS = [
  "Wie erfasse ich einen Einsatz?",
  "Wo finde ich mein Fahrtenbuch?",
  "Wie beantrage ich Urlaub?",
  "Was ist ein Leistungsnachweis?",
];

export default function KiAssistent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hallo! Ich bin **LENA**, dein KI-Assistent im Lebenswert Betreuung Portal. 🌿\n\nIch helfe dir bei allen Fragen rund um das Portal, Pflegeprozesse und Dokumentation. Was kann ich für dich tun?` },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = (trpc as any).ki.chat.useMutation({
    onSuccess: (data: { content: string }) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      setIsTyping(false);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut." }]);
      setIsTyping(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate({ messages: newMessages });
  };

  const renderContent = (text: string) => {
    // Einfaches Markdown: **bold**, Zeilenumbrüche
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="KI-Assistent LENA"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: "50%",
          background: open ? "#1a2e1a" : LENA_COLOR,
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(74,140,63,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, transition: "all 0.2s",
          transform: open ? "scale(0.95)" : "scale(1)",
        }}
      >
        {open ? "✕" : AVATAR_EMOJI}
      </button>

      {/* Chat-Fenster */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 999,
          width: 360, maxWidth: "calc(100vw - 48px)",
          height: 520, maxHeight: "calc(100vh - 120px)",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.2s ease-out",
        }}>
          {/* Header */}
          <div style={{
            background: LENA_COLOR, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>{AVATAR_EMOJI}</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{LENA_NAME}</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                {isTyping ? "tippt…" : "KI-Assistentin · Online"}
              </div>
            </div>
            <button
              onClick={() => setMessages([{ role: "assistant", content: `Hallo! Ich bin **LENA**, dein KI-Assistent. 🌿\n\nWas kann ich für dich tun?` }])}
              title="Chat zurücksetzen"
              style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 11 }}
            >
              🔄 Neu
            </button>
          </div>

          {/* Nachrichten */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: LENA_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {AVATAR_EMOJI}
                  </div>
                )}
                <div style={{
                  maxWidth: "78%", padding: "9px 13px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? LENA_COLOR : "#f3f4f6",
                  color: msg.role === "user" ? "#fff" : "#1f2937",
                  fontSize: 13, lineHeight: 1.5,
                }}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              </div>
            ))}
            {isTyping && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: LENA_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{AVATAR_EMOJI}</div>
                <div style={{ background: "#f3f4f6", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Questions (nur wenn wenige Nachrichten) */}
          {messages.length <= 2 && !isTyping && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  background: "rgba(74,140,63,0.08)", border: "1px solid rgba(74,140,63,0.2)",
                  borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer",
                  color: LENA_COLOR, fontWeight: 600,
                }}>{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Frage stellen…"
              disabled={isTyping}
              style={{
                flex: 1, padding: "9px 13px", borderRadius: 20,
                border: "1px solid #e5e7eb", outline: "none", fontSize: 13,
                background: isTyping ? "#f9fafb" : "#fff",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: input.trim() && !isTyping ? LENA_COLOR : "#e5e7eb",
                border: "none", cursor: input.trim() && !isTyping ? "pointer" : "default",
                color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s", flexShrink: 0,
              }}
            >↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
