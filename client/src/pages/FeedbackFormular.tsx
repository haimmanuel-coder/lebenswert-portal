import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const KATEGORIEN = [
  { value: "fehler", label: "🐛 Fehler melden", color: "#ef4444" },
  { value: "verbesserung", label: "💡 Verbesserungsvorschlag", color: "#f59e0b" },
  { value: "frage", label: "❓ Frage", color: "#3b82f6" },
  { value: "lob", label: "👍 Lob", color: "#10b981" },
];

export default function FeedbackFormular() {
  const [kategorie, setKategorie] = useState("verbesserung");
  const [nachricht, setNachricht] = useState("");
  const [seite, setSeite] = useState("");
  const [sending, setSending] = useState(false);

  const feedbackSenden = (trpc as any).feedback.senden.useMutation({
    onSuccess: () => {
      toast.success("✅ Vielen Dank für dein Feedback! Wir kümmern uns darum.");
      setNachricht("");
      setSeite("");
    },
    onError: (e: any) => toast.error("Fehler: " + e.message),
  });

  const handleSubmit = async () => {
    if (!nachricht.trim()) {
      toast.error("Bitte gib eine Nachricht ein.");
      return;
    }
    setSending(true);
    try {
      await feedbackSenden.mutateAsync({ kategorie, nachricht: nachricht.trim(), seite: seite.trim() || undefined });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a5c38", margin: "0 0 4px" }}>💬 Feedback & Verbesserungsvorschläge</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Hilf uns, die App besser zu machen! Dein Feedback wird direkt an die Geschäftsführung weitergeleitet.
        </p>
      </div>

      {/* Kategorie */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Was möchtest du melden?</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {KATEGORIEN.map(k => (
            <button
              key={k.value}
              onClick={() => setKategorie(k.value)}
              style={{
                padding: "10px 12px", border: kategorie === k.value ? `2px solid ${k.color}` : "2px solid #e5e7eb",
                borderRadius: 10, background: kategorie === k.value ? k.color + "10" : "#fff",
                cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left",
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seite (optional) */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Welche Seite betrifft es? (optional)</label>
        <input
          type="text"
          value={seite}
          onChange={e => setSeite(e.target.value)}
          placeholder="z.B. Einsatzplanung, Fahrtenbuch, Kalender…"
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
        />
      </div>

      {/* Nachricht */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Deine Nachricht *</label>
        <textarea
          value={nachricht}
          onChange={e => setNachricht(e.target.value)}
          placeholder="Beschreibe möglichst genau, was dir aufgefallen ist oder was du dir wünschst…"
          rows={5}
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
        />
      </div>

      {/* Absenden */}
      <button
        onClick={handleSubmit}
        disabled={sending || !nachricht.trim()}
        style={{
          width: "100%", padding: "14px", background: sending ? "#9ca3af" : "#1a5c38",
          color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
          cursor: nachricht.trim() ? "pointer" : "not-allowed",
        }}
      >
        {sending ? "⏳ Wird gesendet…" : "📨 Feedback absenden"}
      </button>

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, textAlign: "center" }}>
        Dein Feedback wird vertraulich behandelt und nur intern verwendet.
      </p>
    </div>
  );
}
