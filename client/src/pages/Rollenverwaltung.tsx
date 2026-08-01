import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mitarbeiter = {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  rolle: string;
  aktiv?: number;
};

const ROLLEN = [
  { value: "admin", label: "Administrator", icon: "🔑", color: "#dc2626", bg: "#fee2e2", desc: "Vollzugriff auf alle Bereiche, Benutzerverwaltung, Exporte, Logbuch" },
  { value: "teamleitung", label: "Teamleitung", icon: "👥", color: "#7c3aed", bg: "#f5f3ff", desc: "Einsatzplanung, Termine planen, Mitarbeiterübersicht, Besuchsberichte freigeben" },
  { value: "buchhaltung", label: "Buchhaltung", icon: "💼", color: "#b45309", bg: "#fffbeb", desc: "Kundenliste (lesend), Finanzen, DATEV-Export, Leistungsnachweise" },
  { value: "mitarbeiter", label: "Mitarbeiter", icon: "👤", color: "#4a8c3f", bg: "#f0fdf4", desc: "Zeiterfassung, eigene Einsätze, Kundenliste (lesend), Leistungsnachweise" },
];

export default function Rollenverwaltung() {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<number | null>(null);

  const { data: mitarbeiterListe = [], refetch } = trpc.admin.mitarbeiterList.useQuery();
  const updateRolleMut = trpc.admin.updateRolle.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const filtered = (mitarbeiterListe as Mitarbeiter[]).filter((m) => {
    const q = search.toLowerCase();
    return (
      m.vorname.toLowerCase().includes(q) ||
      m.nachname.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const handleRolleChange = async (mitarbeiterId: number, neueRolle: string, name: string) => {
    setSaving(mitarbeiterId);
    try {
      await updateRolleMut.mutateAsync({ mitarbeiterId, rolle: neueRolle as "admin" | "teamleitung" | "buchhaltung" | "mitarbeiter" });
      toast.success(`Rolle von ${name} auf "${neueRolle}" geändert`);
    } finally {
      setSaving(null);
    }
  };

  const rollenCounts = ROLLEN.map(r => ({
    ...r,
    count: (mitarbeiterListe as Mitarbeiter[]).filter(m => m.rolle === r.value).length,
  }));

  return (
    <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: 0 }}>🔑 Rollenverwaltung</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Weise Mitarbeitern Rollen zu oder entziehe sie. Änderungen wirken sofort beim nächsten Login.
        </p>
      </div>

      {/* Statistik-Kacheln */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #6b7280" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937" }}>{(mitarbeiterListe as Mitarbeiter[]).length}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Gesamt</div>
        </div>
        {rollenCounts.map(r => (
          <div key={r.value} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${r.color}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: r.color }}>{r.count}</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Rollen-Erklärung */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {ROLLEN.map((r) => (
          <div key={r.value} style={{ background: r.bg, border: `1.5px solid ${r.color}33`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.label}</span>
            </div>
            <p style={{ fontSize: 11, color: "#4b5563", margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Suche */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="🔍 Mitarbeiter suchen (Name oder E-Mail)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb",
            borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
            background: "#fff",
          }}
        />
      </div>

      {/* Mitarbeiter-Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>
            Keine Mitarbeiter gefunden
          </div>
        )}
        {filtered.map((m) => {
          const currentRolle = ROLLEN.find((r) => r.value === m.rolle) ?? ROLLEN[3];
          const isSaving = saving === m.id;
          return (
            <div key={m.id} style={{
              background: "#fff", borderRadius: 14, padding: "16px 18px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
              border: `1.5px solid ${m.aktiv === 0 ? "#e5e7eb" : "transparent"}`,
              opacity: m.aktiv === 0 ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: currentRolle.bg, border: `2px solid ${currentRolle.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 800, color: currentRolle.color, flexShrink: 0,
                }}>
                  {m.vorname[0]}{m.nachname[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>
                    {m.vorname} {m.nachname}
                    {m.aktiv === 0 && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#9ca3af", background: "#f3f4f6", padding: "2px 6px", borderRadius: 6 }}>INAKTIV</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{m.email}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: currentRolle.bg, color: currentRolle.color,
                      border: `1px solid ${currentRolle.color}44`,
                    }}>
                      {currentRolle.icon} {currentRolle.label}
                    </span>
                  </div>
                </div>

                {/* Rollen-Buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0, maxWidth: 280, justifyContent: "flex-end" }}>
                  {ROLLEN.map((r) => {
                    const isActive = m.rolle === r.value;
                    return (
                      <button
                        key={r.value}
                        disabled={isActive || isSaving}
                        onClick={() => handleRolleChange(m.id, r.value, `${m.vorname} ${m.nachname}`)}
                        style={{
                          padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          cursor: isActive || isSaving ? "default" : "pointer",
                          border: isActive ? `2px solid ${r.color}` : "2px solid #e5e7eb",
                          background: isActive ? r.bg : "#f9fafb",
                          color: isActive ? r.color : "#6b7280",
                          opacity: isSaving ? 0.6 : 1,
                          transition: "all 0.15s",
                          minWidth: 120,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        }}
                      >
                        {isSaving && !isActive ? (
                          <span style={{ fontSize: 11 }}>⏳</span>
                        ) : (
                          <span>{r.icon}</span>
                        )}
                        {isActive ? `✓ ${r.label}` : `→ ${r.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hinweis */}
      <div style={{ marginTop: 24, background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 12, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>Wichtiger Hinweis</div>
            <p style={{ fontSize: 12, color: "#78350f", margin: 0, lineHeight: 1.6 }}>
              Rollenänderungen wirken sofort. Teamleitung darf Termine planen und Besuchsberichte freigeben. Buchhaltung hat Zugriff auf Finanzdaten und DATEV-Export. Wenn du einem Mitarbeiter die Admin-Rolle gibst, hat er vollen Zugriff auf alle Daten. Es muss immer mindestens ein Administrator im System verbleiben.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
