import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

const STATUS_FARBEN: Record<string, { bg: string; color: string; border: string }> = {
  entwurf: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  eingereicht: { bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" },
  genehmigt: { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  abgelehnt: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
};

export default function Besuchsberichte() {
  const { mitarbeiter } = usePortalAuth() as any;
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [tab, setTab] = useState<"meine" | "alle">(isAdmin ? "alle" : "meine");
  const [showCreate, setShowCreate] = useState(false);
  const [filterKunde, setFilterKunde] = useState("");

  const { data: meineberichte = [], refetch: refetchMeine } = (trpc.besuchsberichte as any).getMeineBerichte.useQuery(
    undefined,
    { enabled: tab === "meine" }
  );
  const { data: alleberichte = [], refetch: refetchAlle } = (trpc.besuchsberichte as any).getAlleBerichte.useQuery(
    undefined,
    { enabled: tab === "alle" && isAdmin }
  );
  const { data: kunden = [] } = (trpc.kunden as any).list.useQuery();

  const [form, setForm] = useState({
    kundeId: 0,
    datum: new Date().toISOString().split("T")[0],
    startzeit: "09:00",
    endzeit: "10:00",
    inhalt: "",
    stimmung: "gut" as "sehr_gut" | "gut" | "neutral" | "besorgniserregend",
    massnahmen: "",
    naechsterTermin: "",
    unterschriftKunde: false,
  });

  const createBericht = (trpc.besuchsberichte as any).create.useMutation({
    onSuccess: () => {
      toast.success("✅ Besuchsbericht gespeichert!");
      setShowCreate(false);
      setForm({ kundeId: 0, datum: new Date().toISOString().split("T")[0], startzeit: "09:00", endzeit: "10:00", inhalt: "", stimmung: "gut", massnahmen: "", naechsterTermin: "", unterschriftKunde: false });
      if (tab === "meine") refetchMeine(); else refetchAlle();
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const updateStatus = (trpc.besuchsberichte as any).updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert"); refetchAlle(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const berichte = tab === "meine" ? (meineberichte as any[]) : (alleberichte as any[]);
  const gefilterteBerichte = filterKunde
    ? berichte.filter((b: any) => `${b.kunde?.vorname} ${b.kunde?.nachname}`.toLowerCase().includes(filterKunde.toLowerCase()))
    : berichte;

  const STIMMUNG_LABELS: Record<string, string> = {
    sehr_gut: "😊 Sehr gut",
    gut: "🙂 Gut",
    neutral: "😐 Neutral",
    besorgniserregend: "😟 Besorgniserregend",
  };

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>📋 Besuchsberichte</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Dokumentation aller Kundenbesuche</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          ➕ Neuer Bericht
        </button>
      </div>

      {/* Tab-Navigation */}
      {isAdmin && (
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {[
            { id: "meine", label: "📋 Meine Berichte" },
            { id: "alle", label: "👥 Alle Berichte" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 12,
                background: tab === t.id ? "#fff" : "transparent",
                color: tab === t.id ? "#0d9488" : "#6b7280",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="🔍 Nach Kunde filtern..."
          value={filterKunde}
          onChange={e => setFilterKunde(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 14, boxSizing: "border-box" }}
        />
      </div>

      {/* Berichte-Liste */}
      <div style={{ display: "grid", gap: 12 }}>
        {gefilterteBerichte.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700 }}>Keine Besuchsberichte vorhanden</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Erstelle den ersten Bericht mit dem Button oben rechts.</div>
          </div>
        ) : (
          gefilterteBerichte.map((b: any) => {
            const statusFarbe = STATUS_FARBEN[b.status] ?? STATUS_FARBEN.entwurf;
            return (
              <div key={b.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                      {b.kunde?.vorname} {b.kunde?.nachname}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {new Date(b.datum).toLocaleDateString("de-DE")} · {b.startzeit}–{b.endzeit} Uhr
                      {b.mitarbeiter && ` · ${b.mitarbeiter.vorname} ${b.mitarbeiter.nachname}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>{STIMMUNG_LABELS[b.stimmung] ?? b.stimmung}</span>
                    <span style={{
                      background: statusFarbe.bg, color: statusFarbe.color,
                      border: `1px solid ${statusFarbe.border}`,
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    }}>
                      {b.status === "entwurf" ? "📝 Entwurf" : b.status === "eingereicht" ? "📤 Eingereicht" : b.status === "genehmigt" ? "✅ Genehmigt" : "❌ Abgelehnt"}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{b.inhalt}</div>
                  {b.massnahmen && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#166534" }}>
                      <strong>Maßnahmen:</strong> {b.massnahmen}
                    </div>
                  )}
                  {b.unterschriftKunde && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>✍️ Unterschrift des Kunden vorhanden</div>
                  )}
                  {isAdmin && b.status === "eingereicht" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => updateStatus.mutate({ id: b.id, status: "genehmigt" })}
                        style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        ✅ Genehmigen
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: b.id, status: "abgelehnt" })}
                        style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        ❌ Ablehnen
                      </button>
                    </div>
                  )}
                  {b.status === "entwurf" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: b.id, status: "eingereicht" })}
                      style={{ marginTop: 10, background: "#eff6ff", color: "#1e40af", border: "1px solid #93c5fd", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      📤 Einreichen
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Neuer Bericht Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px", maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>📋 Neuer Besuchsbericht</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Kunde *</label>
                <select
                  value={form.kundeId}
                  onChange={e => setForm(f => ({ ...f, kundeId: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14 }}
                >
                  <option value={0}>Bitte wählen...</option>
                  {(kunden as any[]).map((k: any) => (
                    <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Datum *</label>
                  <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Von</label>
                  <input type="time" value={form.startzeit} onChange={e => setForm(f => ({ ...f, startzeit: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Bis</label>
                  <input type="time" value={form.endzeit} onChange={e => setForm(f => ({ ...f, endzeit: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Stimmung des Kunden</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(STIMMUNG_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, stimmung: val as any }))}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 10, border: `2px solid ${form.stimmung === val ? "#0d9488" : "#e5e7eb"}`,
                        background: form.stimmung === val ? "#f0fdfa" : "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700,
                        color: form.stimmung === val ? "#0d9488" : "#6b7280",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Bericht *</label>
                <textarea
                  value={form.inhalt}
                  onChange={e => setForm(f => ({ ...f, inhalt: e.target.value }))}
                  placeholder="Beschreibe den Besuch, Beobachtungen, Besonderheiten..."
                  rows={4}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Maßnahmen / Empfehlungen</label>
                <textarea
                  value={form.massnahmen}
                  onChange={e => setForm(f => ({ ...f, massnahmen: e.target.value }))}
                  placeholder="Eingeleitete oder empfohlene Maßnahmen..."
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Nächster Termin</label>
                <input type="date" value={form.naechsterTermin} onChange={e => setForm(f => ({ ...f, naechsterTermin: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                <input
                  type="checkbox"
                  checked={form.unterschriftKunde}
                  onChange={e => setForm(f => ({ ...f, unterschriftKunde: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>✍️ Unterschrift des Kunden liegt vor</span>
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{ flex: 1, background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => createBericht.mutate(form as any)}
                  disabled={createBericht.isPending || !form.kundeId || !form.inhalt}
                  style={{ flex: 2, background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (!form.kundeId || !form.inhalt) ? 0.5 : 1 }}
                >
                  {createBericht.isPending ? "Wird gespeichert..." : "💾 Bericht speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
