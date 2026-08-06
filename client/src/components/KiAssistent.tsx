import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts?: number;
}

interface KiAssistentProps {
  aktiveSeite?: string;
}

const LENA_COLOR = "#4a8c3f";
const STORAGE_KEY = "lena-chat-history";
const MAX_STORED = 40; // max Nachrichten im LocalStorage

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Hallo! Ich bin **LENA**, deine KI-Assistentin im Lebenswert Betreuung Portal. 🌿\n\nIch helfe dir bei allen Fragen rund um das Portal, Pflegeprozesse und Dokumentation. Was kann ich für dich tun?",
  ts: Date.now(),
};

const QUICK_QUESTIONS = [
  "Wie erfasse ich einen Einsatz?",
  "Wo finde ich mein Fahrtenbuch?",
  "Wie beantrage ich Urlaub?",
  "Was ist ein Leistungsnachweis?",
];

// Web Speech API Typen
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [INITIAL_MESSAGE];
    const parsed: Message[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : [INITIAL_MESSAGE];
  } catch {
    return [INITIAL_MESSAGE];
  }
}

function saveHistory(msgs: Message[]) {
  try {
    const toSave = msgs.slice(-MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export default function KiAssistent({ aktiveSeite }: KiAssistentProps) {
  const { mitarbeiter } = usePortalAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(() =>
    typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const chatMutation = (trpc as any).ki.chat.useMutation({
    onSuccess: (data: { content: string }) => {
      const newMsg: Message = { role: "assistant", content: data.content, ts: Date.now() };
      setMessages(prev => {
        const updated = [...prev, newMsg];
        saveHistory(updated);
        return updated;
      });
      setIsTyping(false);
    },
    onError: () => {
      const errMsg: Message = { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.", ts: Date.now() };
      setMessages(prev => {
        const updated = [...prev, errMsg];
        saveHistory(updated);
        return updated;
      });
      setIsTyping(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    const userMsg: Message = { role: "user", content: trimmed, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveHistory(newMessages);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      kontext: {
        mitarbeiterName: mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : undefined,
        aktiveSeite: aktiveSeite ?? "Dashboard",
        rolle: mitarbeiter?.rolle ?? "mitarbeiter",
      },
    });
  }, [messages, isTyping, mitarbeiter, aktiveSeite, chatMutation]);

  const resetChat = () => {
    const fresh = [{ ...INITIAL_MESSAGE, ts: Date.now() }];
    setMessages(fresh);
    saveHistory(fresh);
  };

  // Spracheingabe
  const toggleListening = useCallback(() => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, speechSupported]);

  const renderContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");

  const vorname = mitarbeiter?.vorname ?? "";

  return (
    <>
      {/* Floating Button mit Puls-Animation wenn geschlossen */}
      <button
        onClick={() => setOpen(o => !o)}
        title="KI-Assistentin LENA"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: "50%",
          background: open ? "#1a2e1a" : LENA_COLOR,
          border: "none", cursor: "pointer",
          boxShadow: open ? "0 2px 12px rgba(0,0,0,0.3)" : "0 4px 20px rgba(74,140,63,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, transition: "all 0.2s",
          transform: open ? "scale(0.95)" : "scale(1)",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat-Fenster */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 999,
          width: 370, maxWidth: "calc(100vw - 48px)",
          height: 540, maxHeight: "calc(100vh - 120px)",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "lenaSlideUp 0.2s ease-out",
        }}>
          {/* Header */}
          <div style={{ background: LENA_COLOR, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>LENA</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                {isTyping ? "tippt…" : isListening ? "🎙️ Höre zu…" : `KI-Assistentin${vorname ? ` · Hallo ${vorname}!` : ""}`}
              </div>
            </div>
            <button onClick={resetChat} title="Chat zurücksetzen" style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 11 }}>
              🔄 Neu
            </button>
          </div>

          {/* Kontext-Badge */}
          {aktiveSeite && (
            <div style={{ background: "rgba(74,140,63,0.06)", borderBottom: "1px solid rgba(74,140,63,0.1)", padding: "5px 14px", fontSize: 10, color: "#4a8c3f", fontWeight: 600 }}>
              📍 Du bist gerade auf: <strong>{aktiveSeite}</strong>
            </div>
          )}

          {/* Nachrichten */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: LENA_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
                )}
                <div
                  style={{
                    maxWidth: "78%", padding: "9px 13px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: LENA_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                <div style={{ background: "#f3f4f6", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af", animation: `lenaBounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Questions */}
          {messages.length <= 2 && !isTyping && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{ background: "rgba(74,140,63,0.08)", border: "1px solid rgba(74,140,63,0.2)", borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: LENA_COLOR, fontWeight: 600 }}>{q}</button>
              ))}
            </div>
          )}

          {/* Input-Zeile */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            {/* Mikrofon-Button */}
            {speechSupported && (
              <button
                onClick={toggleListening}
                title={isListening ? "Aufnahme stoppen" : "Spracheingabe starten"}
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: isListening ? "#dc2626" : "#f3f4f6",
                  border: "none", cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                  animation: isListening ? "lenaPulse 1s infinite" : "none",
                }}
              >
                🎙️
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder={isListening ? "Spreche jetzt…" : "Frage stellen…"}
              disabled={isTyping}
              style={{
                flex: 1, padding: "9px 13px", borderRadius: 20,
                border: `1px solid ${isListening ? "#dc2626" : "#e5e7eb"}`,
                outline: "none", fontSize: 13,
                background: isTyping ? "#f9fafb" : "#fff",
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: input.trim() && !isTyping ? LENA_COLOR : "#e5e7eb",
                border: "none", cursor: input.trim() && !isTyping ? "pointer" : "default",
                color: "#fff", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
            >↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lenaSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lenaBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes lenaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
      `}</style>
    </>
  );
}
