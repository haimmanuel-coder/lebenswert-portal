/**
 * ════════════════════════════════════════════════════════════════════════════
 *  SICHERHEITSUNTERWEISUNGEN – Mitarbeiter-Ansicht
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Zeigt alle aktiven Unterweisungen mit:
 *   • Pflichtlektüre-Anzeige (Inhalt muss gelesen werden)
 *   • Digitale Bestätigung mit Timestamp
 *   • Fortschrittsanzeige (wie viele noch offen)
 *   • Kategorie-Badges (Brandschutz, Hygiene, etc.)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const KATEGORIE_FARBEN: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  brandschutz:    { bg: "#fef2f2", text: "#dc2626", label: "Brandschutz",    icon: "🔥" },
  erstehilfe:     { bg: "#f0fdf4", text: "#16a34a", label: "Erste Hilfe",    icon: "🏥" },
  hygiene:        { bg: "#eff6ff", text: "#2563eb", label: "Hygiene",        icon: "🧼" },
  arbeitsschutz:  { bg: "#fffbeb", text: "#d97706", label: "Arbeitsschutz", icon: "⛑️" },
  datenschutz:    { bg: "#f5f3ff", text: "#7c3aed", label: "Datenschutz",   icon: "🔒" },
  sonstiges:      { bg: "#f9fafb", text: "#6b7280", label: "Sonstiges",     icon: "📋" },
};

export default function Sicherheitsunterweisungen() {
  const { data: unterweisungen = [], refetch } = trpc.sicherheitsunterweisung.list.useQuery();
  const bestaetigenMutation = trpc.sicherheitsunterweisung.bestaetigen.useMutation({
    onSuccess: () => refetch(),
  });

  const [geoeffnet, setGeoeffnet] = useState<number | null>(null);
  const [gelesen, setGelesen] = useState<Set<number>>(new Set());
  const [bestaetigt, setBestaetigt] = useState<Set<number>>(new Set());

  const offen = (unterweisungen as any[]).filter((u: any) => u.pflicht && !u.bestaetigtId);
  const erledigt = (unterweisungen as any[]).filter((u: any) => u.bestaetigtId);
  const gesamt = (unterweisungen as any[]).filter((u: any) => u.pflicht).length;
  const erledigtCount = (unterweisungen as any[]).filter((u: any) => u.pflicht && u.bestaetigtId).length;
  const fortschritt = gesamt > 0 ? Math.round((erledigtCount / gesamt) * 100) : 100;

  const handleOeffnen = (id: number) => {
    setGeoeffnet(geoeffnet === id ? null : id);
    setGelesen(prev => new Set(Array.from(prev).concat(id)));
  };

  const handleBestaetigen = async (id: number) => {
    setBestaetigt(prev => new Set(Array.from(prev).concat(id)));
    await bestaetigenMutation.mutateAsync({ unterweisungId: id });
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>
          🛡️ Sicherheitsunterweisungen
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Pflichtlektüren lesen und digital bestätigen
        </p>
      </div>

      {/* Fortschrittsanzeige */}
      {gesamt > 0 && (
        <div style={{
          background: fortschritt === 100 ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "linear-gradient(135deg, #fffbeb, #fef3c7)",
          border: `1.5px solid ${fortschritt === 100 ? "#86efac" : "#fcd34d"}`,
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: fortschritt === 100 ? "#15803d" : "#92400e" }}>
              {fortschritt === 100 ? "✅ Alle Pflichtunterweisungen bestätigt!" : `${erledigtCount} von ${gesamt} Pflichtunterweisungen bestätigt`}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: fortschritt === 100 ? "#15803d" : "#d97706" }}>
              {fortschritt}%
            </span>
          </div>
          <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${fortschritt}%`,
              height: "100%",
              background: fortschritt === 100 ? "#22c55e" : "#f59e0b",
              borderRadius: 99,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      {/* Offene Pflicht-Unterweisungen */}
      {offen.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", marginBottom: 10 }}>
            ⚠️ Noch zu bestätigen ({offen.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {offen.map((u: any) => {
              const kf = KATEGORIE_FARBEN[u.kategorie] ?? KATEGORIE_FARBEN.sonstiges;
              const istOffen = geoeffnet === u.id;
              const wurdeGelesen = gelesen.has(u.id);
              const wirdBestaetigt = bestaetigt.has(u.id);

              return (
                <div key={u.id} style={{
                  background: "#fff",
                  border: "1.5px solid #fca5a5",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}>
                  {/* Kopfzeile */}
                  <button
                    onClick={() => handleOeffnen(u.id)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "14px 16px",
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{kf.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{u.titel}</div>
                      <div style={{ fontSize: 11, marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ background: kf.bg, color: kf.text, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                          {kf.label}
                        </span>
                        <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                          Pflicht
                        </span>
                        <span style={{ color: "#9ca3af" }}>Version {u.version}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: "#6b7280" }}>{istOffen ? "▲" : "▼"}</span>
                  </button>

                  {/* Inhalt (aufklappbar) */}
                  {istOffen && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "14px 16px",
                        fontSize: 13.5,
                        lineHeight: 1.7,
                        color: "#374151",
                        marginBottom: 14,
                        whiteSpace: "pre-wrap",
                      }}>
                        {u.inhalt}
                      </div>

                      {wurdeGelesen && !wirdBestaetigt && (
                        <button
                          onClick={() => handleBestaetigen(u.id)}
                          disabled={bestaetigenMutation.isPending}
                          style={{
                            width: "100%",
                            padding: "12px 0",
                            background: "linear-gradient(135deg, #16a34a, #15803d)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          ✅ Ich habe diese Unterweisung gelesen und verstanden
                        </button>
                      )}
                      {wirdBestaetigt && (
                        <div style={{ textAlign: "center", color: "#16a34a", fontWeight: 700, fontSize: 14, padding: "10px 0" }}>
                          ✅ Bestätigt! Danke.
                        </div>
                      )}
                      {!wurdeGelesen && (
                        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "6px 0" }}>
                          Bitte den Text vollständig lesen, um bestätigen zu können.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bereits bestätigte Unterweisungen */}
      {erledigt.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#15803d", marginBottom: 10 }}>
            ✅ Bereits bestätigt ({erledigt.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {erledigt.map((u: any) => {
              const kf = KATEGORIE_FARBEN[u.kategorie] ?? KATEGORIE_FARBEN.sonstiges;
              return (
                <div key={u.id} style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>{kf.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>{u.titel}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      Bestätigt am {new Date(u.bestaetigtAm).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr
                    </div>
                  </div>
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    ✓ Bestätigt
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unterweisungen.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 14 }}>
          Keine Sicherheitsunterweisungen vorhanden.
        </div>
      )}
    </div>
  );
}
