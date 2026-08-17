import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PRIO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  normal:   { bg: "#f3f4f6", color: "#374151", label: "Normal" },
  wichtig:  { bg: "#fef3c7", color: "#92400e", label: "⚠️ Wichtig" },
  dringend: { bg: "#fee2e2", color: "#991b1b", label: "🚨 Dringend" },
};

export default function MitteilungenAdminTab() {
  const [titel, setTitel] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [prioritaet, setPrioritaet] = useState<"normal"|"wichtig"|"dringend">("normal");
  const [pflicht, setPflicht] = useState(true);
  const [gueltigBis, setGueltigBis] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: mitteilungen = [], refetch } = (trpc as any).mitteilungen.adminListe.useQuery();
  const erstellen = (trpc as any).mitteilungen.erstellen.useMutation({
    onSuccess: () => { toast.success("✅ Mitteilung erstellt und an alle Mitarbeiter gesendet"); refetch(); setShowForm(false); setTitel(""); setInhalt(""); setPrioritaet("normal"); setPflicht(true); setGueltigBis(""); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });
  const deaktivieren = (trpc as any).mitteilungen.loeschen.useMutation({
    onSuccess: () => { toast.success("Mitteilung deaktiviert"); refetch(); },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>📢 Mitteilungen</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Informationen an alle Mitarbeiter senden</div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ padding: "8px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {showForm ? "✕ Abbrechen" : "+ Neue Mitteilung"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 20, border: "2px solid #4a8c3f" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#4a8c3f" }}>📝 Neue Mitteilung erstellen</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Titel *</label>
              <input value={titel} onChange={e => setTitel(e.target.value)} placeholder="z. B. Wichtige Information zur Urlaubsplanung"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, marginTop: 4, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Inhalt *</label>
              <textarea value={inhalt} onChange={e => setInhalt(e.target.value)} rows={4} placeholder="Vollständiger Text der Mitteilung..."
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, marginTop: 4, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Priorität</label>
                <select value={prioritaet} onChange={e => setPrioritaet(e.target.value as any)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, marginTop: 4 }}>
                  <option value="normal">Normal</option>
                  <option value="wichtig">⚠️ Wichtig</option>
                  <option value="dringend">🚨 Dringend</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Gültig bis (optional)</label>
                <input type="date" value={gueltigBis} onChange={e => setGueltigBis(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, marginTop: 4 }} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 2 }}>
                <input type="checkbox" id="pflicht" checked={pflicht} onChange={e => setPflicht(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }} />
                <label htmlFor="pflicht" style={{ fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>Lesebestätigung Pflicht</label>
              </div>
            </div>
            <button onClick={() => erstellen.mutate({ titel, inhalt, typ: prioritaet, pflichtBestaetigung: pflicht, gueltigBis: gueltigBis || undefined })}
              disabled={!titel.trim() || !inhalt.trim() || erstellen.isPending}
              style={{ padding: "10px 20px", background: !titel.trim() || !inhalt.trim() ? "#9ca3af" : "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: !titel.trim() || !inhalt.trim() ? "not-allowed" : "pointer" }}>
              {erstellen.isPending ? "⏳ Wird gesendet..." : "📢 An alle Mitarbeiter senden"}
            </button>
          </div>
        </div>
      )}

      {(mitteilungen as any[]).length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Noch keine Mitteilungen erstellt</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {(mitteilungen as any[]).map((m: any) => {
            const prio = PRIO_STYLE[m.typ] ?? PRIO_STYLE.normal;
            const bestaetigt = Number(m.anzahlBestaetigt ?? 0);
            const gesamt = Number(m.gesamtMitarbeiter ?? 0);
            const prozent = gesamt > 0 ? Math.round((bestaetigt / gesamt) * 100) : 0;
            return (
              <div key={m.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, opacity: m.aktiv ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: prio.bg, color: prio.color }}>{prio.label}</span>
                      {!m.aktiv && <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, background: "#f3f4f6", color: "#9ca3af" }}>Deaktiviert</span>}
                      {m.pflichtBestaetigung ? <span style={{ fontSize: 11, color: "#6b7280" }}>✍️ Bestätigung Pflicht</span> : null}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{m.titel}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, whiteSpace: "pre-wrap" }}>{m.inhalt}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(m.createdAt).toLocaleString("de-DE")}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: prozent === 100 ? "#4a8c3f" : "#374151" }}>{prozent}%</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{bestaetigt}/{gesamt} gelesen</div>
                    <div style={{ width: 80, height: 6, background: "#e5e7eb", borderRadius: 3, marginTop: 4 }}>
                      <div style={{ width: `${prozent}%`, height: "100%", background: prozent === 100 ? "#4a8c3f" : "#f59e0b", borderRadius: 3, transition: "width .3s" }} />
                    </div>
                    {m.aktiv ? (
                      <button onClick={() => deaktivieren.mutate({ id: m.id })}
                        style={{ marginTop: 8, padding: "4px 10px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                        Deaktivieren
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
