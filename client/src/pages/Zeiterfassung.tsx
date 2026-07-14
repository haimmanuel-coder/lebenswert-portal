import { useState, useEffect } from "react";
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
  const getKundeName = (id: number) => { const k = kunden.find((c) => c.id === id); return k ? `${k.vorname} ${k.nachname}` : `Kunde #${id}`; };
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

  const heute = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="lw-page">
      <div className="lw-page-header">
        <div>
          <div className="lw-page-title">Zeiterfassung</div>
          <div className="lw-page-subtitle">{heute}</div>
        </div>
      </div>

      {/* Timer */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-body" style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.875rem", color: "var(--lw-gray-500)", marginBottom: "0.5rem" }}>{timerLabel}</div>
          <div style={{ fontFamily: "monospace", fontSize: "3.5rem", fontWeight: 800, color: isRunning ? "var(--lw-green-600)" : "var(--lw-gray-300)", letterSpacing: "0.05em", marginBottom: "1.5rem" }}>
            {timerDisplay}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={isRunning ? pause : start}
              style={{ padding: "0.875rem 2rem", border: "none", borderRadius: "var(--lw-r-md)", fontSize: "1rem", fontWeight: 700, cursor: "pointer", background: isRunning ? "var(--lw-yellow)" : "var(--lw-green-600)", color: "#fff", transition: "all 0.15s" }}
            >
              {isRunning ? "⏸ Pause" : isPaused ? "▶ Weiter" : "▶ Starten"}
            </button>
            {(isRunning || isPaused) && (
              <button
                onClick={() => { stop(); toast.success("Timer beendet"); }}
                style={{ padding: "0.875rem 2rem", border: "none", borderRadius: "var(--lw-r-md)", fontSize: "1rem", fontWeight: 700, cursor: "pointer", background: "var(--lw-red)", color: "#fff" }}
              >
                ⏹ Beenden
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manuelle Erfassung */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-header"><div style={{ fontWeight: 700, fontSize: "1rem" }}>✏️ Manuelle Erfassung</div></div>
        <div className="lw-card-body">

          <div className="lw-grid-2" style={{ marginBottom: "0.75rem" }}>
            <div>
              <label className="lw-label">Datum</label>
              <input type="date" className="lw-input" value={datum} onChange={(e) => setDatum(e.target.value)} />
            </div>
            <div>
              <label className="lw-label">Kunde</label>
              <select className="lw-input" value={kundenId} onChange={(e) => setKundenId(e.target.value)}>
                <option value="">Wählen...</option>
                {kunden.map((k) => (
                  <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="lw-grid-2" style={{ marginBottom: "0.75rem" }}>
            <div>
              <label className="lw-label">Von</label>
              <input type="time" className="lw-input" value={von} onChange={(e) => setVon(e.target.value)} />
            </div>
            <div>
              <label className="lw-label">Bis</label>
              <input type="time" className="lw-input" value={bis} onChange={(e) => setBis(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label className="lw-label">Paragraph</label>
            <select className="lw-input" value={para} onChange={(e) => setPara(e.target.value as typeof para)}>
              <option value="45b">§45b SGB XI – Entlastungsleistung</option>
              <option value="45a">§45a SGB XI – Entlastungsleistung</option>
              <option value="39">§39 SGB XI – Verhinderungspflege</option>
            </select>
          </div>
          <button onClick={saveZeit} disabled={createEinsatz.isPending} className="lw-btn lw-btn-primary" style={{ width: "100%" }}>
            {createEinsatz.isPending ? "Speichern…" : "💾 Zeit speichern"}
          </button>
        </div>
      </div>

      {/* Heute erfasst */}
      <div className="lw-card">
        <div className="lw-card-header">
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>📋 Heute erfasst</div>
          <span className="lw-badge lw-badge-gray">{todayE.length}</span>
        </div>
        {todayE.length === 0 ? (
          <div className="lw-empty">
            <div className="lw-empty-icon">📅</div>
            <div className="lw-empty-text">Noch keine Zeiten heute</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="lw-table">
              <thead><tr><th>Kunde</th><th>Zeit</th><th>Dauer</th><th>§</th><th>Status</th></tr></thead>
              <tbody>
                {todayE.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{getKundeName(e.kundenId)}</td>
                    <td>{(e.startzeit || "").slice(0, 5)} Uhr</td>
                    <td>{e.dauerStunden}h</td>
                    <td><span className="lw-badge lw-badge-green">§{e.paragraph}</span></td>
                    <td><span className={`lw-badge ${e.status === "abgeschlossen" ? "lw-badge-green" : "lw-badge-yellow"}`}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
