import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const WOCHENTAGE = [
  { value: 1, label: "Montag", short: "Mo" },
  { value: 2, label: "Dienstag", short: "Di" },
  { value: 3, label: "Mittwoch", short: "Mi" },
  { value: 4, label: "Donnerstag", short: "Do" },
  { value: 5, label: "Freitag", short: "Fr" },
  { value: 6, label: "Samstag", short: "Sa" },
  { value: 7, label: "Sonntag", short: "So" },
];

const STATUS_OPTS = [
  { value: "verfuegbar", label: "Verfügbar", color: "#4a8c3f", bg: "#f0fdf4" },
  { value: "bevorzugt", label: "Bevorzugt", color: "#7c3aed", bg: "#f5f3ff" },
  { value: "nicht_verfuegbar", label: "Nicht verfügbar", color: "#dc2626", bg: "#fee2e2" },
];

type Verfuegbarkeit = {
  id: number;
  wochentag: number;
  vonZeit: string;
  bisZeit: string;
  status: string;
  gueltigVon?: string | null;
  gueltigBis?: string | null;
};

export default function Verfuegbarkeiten() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    wochentag: 1,
    vonZeit: "08:00",
    bisZeit: "16:00",
    status: "verfuegbar" as "verfuegbar" | "bevorzugt" | "nicht_verfuegbar",
    gueltigVon: "",
    gueltigBis: "",
  });

  const { data: liste = [], isLoading, refetch } = (trpc as any).verfuegbarkeiten.list.useQuery({});
  const createMut = (trpc as any).verfuegbarkeiten.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); toast.success("Verfügbarkeit gespeichert"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = (trpc as any).verfuegbarkeiten.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Verfügbarkeit entfernt"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Gruppiert nach Wochentag
  const grouped = WOCHENTAGE.map(tag => ({
    ...tag,
    eintraege: (liste as Verfuegbarkeit[]).filter(v => v.wochentag === tag.value),
  }));

  return (
    <div style={{ padding: "24px 20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: 0 }}>📅 Meine Verfügbarkeiten</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Gib an, wann du für Einsätze verfügbar bist. Die Tourenplanung berücksichtigt deine Angaben.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#4a8c3f", color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", flexShrink: 0,
          }}
        >
          + Hinzufügen
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", marginBottom: 24, border: "2px solid #4a8c3f" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 16 }}>Neue Verfügbarkeit</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Wochentag</label>
              <select
                value={form.wochentag}
                onChange={e => setForm(f => ({ ...f, wochentag: Number(e.target.value) }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13 }}
              >
                {WOCHENTAGE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13 }}
              >
                {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Von</label>
              <input type="time" value={form.vonZeit} onChange={e => setForm(f => ({ ...f, vonZeit: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Bis</label>
              <input type="time" value={form.bisZeit} onChange={e => setForm(f => ({ ...f, bisZeit: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Gültig ab (optional)</label>
              <input type="date" value={form.gueltigVon} onChange={e => setForm(f => ({ ...f, gueltigVon: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Gültig bis (optional)</label>
              <input type="date" value={form.gueltigBis} onChange={e => setForm(f => ({ ...f, gueltigBis: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowForm(false)}
              style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Abbrechen
            </button>
            <button
              onClick={() => createMut.mutate({ ...form, gueltigVon: form.gueltigVon || undefined, gueltigBis: form.gueltigBis || undefined })}
              disabled={createMut.isPending}
              style={{ flex: 2, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {createMut.isPending ? "⏳ Speichern..." : "✅ Speichern"}
            </button>
          </div>
        </div>
      )}

      {/* Skeleton-Ladeanimation */}
      {isLoading && (
        <>
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 80, height: 13, borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                </div>
                <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
                  <div style={{ width: 110, height: 30, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                  <div style={{ width: 90, height: 30, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {/* Wochenübersicht */}
      {!isLoading && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {grouped.map(tag => (
          <div key={tag.value} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#374151", minWidth: 80 }}>{tag.label}</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>({tag.eintraege.length} Einträge)</span>
            </div>
            {tag.eintraege.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
                Keine Verfügbarkeit eingetragen
              </div>
            ) : (
              <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tag.eintraege.map((v: Verfuegbarkeit) => {
                  const st = STATUS_OPTS.find(s => s.value === v.status) ?? STATUS_OPTS[0];
                  return (
                    <div key={v.id} style={{
                      background: st.bg, border: `1.5px solid ${st.color}44`,
                      borderRadius: 8, padding: "6px 12px",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{v.vonZeit} – {v.bisZeit}</span>
                      <span style={{ fontSize: 10, color: st.color, background: `${st.color}22`, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{st.label}</span>
                      <button
                        onClick={() => deleteMut.mutate({ id: v.id })}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af", padding: 0, lineHeight: 1 }}
                        title="Entfernen"
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>}
    </div>
  );
}
