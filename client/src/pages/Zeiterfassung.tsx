import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTimer } from "@/contexts/TimerContext";

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

export default function Zeiterfassung() {
  const { timerDisplay, timerLabel, isRunning, isPaused, start, pause, stop } = useTimer();
  const today = new Date().toISOString().split("T")[0];

  const [datum, setDatum] = useState(today);
  const [kundenId, setKundenId] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [para, setPara] = useState<"45b" | "45a" | "39">("45b");

  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  const { data: einsaetze = [], refetch } = trpc.einsaetze.list.useQuery();
  const createEinsatz = trpc.einsaetze.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("✅ Zeit gespeichert");
      setVon(""); setBis("");
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const todayE = einsaetze.filter((e) => {
    const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
    return d === today;
  });

  const saveZeit = () => {
    if (!datum || !kundenId || !von || !bis) { toast.error("Alle Felder ausfüllen!"); return; }
    const [vh, vm] = von.split(":").map(Number);
    const [bh, bm] = bis.split(":").map(Number);
    const dauer = ((bh * 60 + bm) - (vh * 60 + vm)) / 60;
    if (dauer <= 0) { toast.error("Endzeit muss nach Startzeit liegen!"); return; }
    createEinsatz.mutate({
      kundenId: parseInt(kundenId),
      datum,
      startzeit: von + ":00",
      dauerStunden: dauer,
      paragraph: para,
    });
  };

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Zeiterfassung</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Stunden erfassen</div>
      </div>

      {/* Timer */}
      <div className="timer-card">
        <div style={{ fontSize: 13, opacity: 0.85 }}>{timerLabel}</div>
        <div className="timer-display">{timerDisplay}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={isRunning ? pause : start}
            style={{
              flex: 1, padding: 12, border: "none", borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              background: "#fff", color: "#4a8c3f",
            }}
          >
            {isRunning ? "⏸ Pausieren" : isPaused ? "▶ Weiter" : "▶ Starten"}
          </button>
          {(isRunning || isPaused) && (
            <button
              onClick={() => { stop(); toast.success("Timer beendet"); }}
              style={{
                flex: 1, padding: 12, border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                background: "rgba(255,255,255,0.2)", color: "#fff",
              }}
            >
              ■ Beenden
            </button>
          )}
        </div>
      </div>

      {/* Manuelle Erfassung */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Manuelle Erfassung</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Datum</label>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Kunde</label>
            <select value={kundenId} onChange={(e) => setKundenId(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
              <option value="">Wählen...</option>
              {kunden.map((k) => (
                <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Von</label>
            <input type="time" value={von} onChange={(e) => setVon(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Bis</label>
            <input type="time" value={bis} onChange={(e) => setBis(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Paragraph</label>
          <select value={para} onChange={(e) => setPara(e.target.value as typeof para)}
            style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
              <option value="45b">§45b SGB XI – Entlastungsleistung</option>
              <option value="45a">§45a SGB XI – Entlastungsleistung</option>
              <option value="39">§39 SGB XI – Verhinderungspflege</option>
          </select>
        </div>

        <button onClick={saveZeit} disabled={createEinsatz.isPending}
          style={{ width: "100%", padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {createEinsatz.isPending ? "Speichern…" : "Zeit speichern"}
        </button>
      </div>

      {/* Heute erfasst */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Heute erfasst</div>
        {todayE.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13, padding: "4px 0" }}>Noch keine Zeiten heute.</p>
        ) : (
          todayE.map((e) => (
            <div key={e.id} className="list-item">
              <div className="li-icon teal">⏱</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.kundeName || "–"}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {(e.startzeit || "").slice(0, 5)} Uhr · {e.dauerStunden}h · §{e.paragraph}
                </div>
              </div>
              <span
                style={{
                  display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  ...(e.status === "abgeschlossen"
                    ? { background: "#e0f2f0", color: "#2a9d8f" }
                    : { background: "#fef3c7", color: "#92400e" }),
                }}
              >
                {e.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
