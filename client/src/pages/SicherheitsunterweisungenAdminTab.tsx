/**
 * ════════════════════════════════════════════════════════════════════════════
 *  SICHERHEITSUNTERWEISUNGEN – Admin-Tab
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Funktionen:
 *  • Übersicht aller Unterweisungen (aktiv/inaktiv) mit Bestätigungsquote
 *  • Neue Unterweisung anlegen
 *  • Bestehende Unterweisung bearbeiten (Titel, Inhalt, Kategorie, Version)
 *  • Unterweisung deaktivieren (mit Bestätigungsdialog)
 *  • Detail-Ansicht: Wer hat bestätigt / wer noch nicht?
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";

// ── Typen ──────────────────────────────────────────────────────────────────
type Kategorie = "brandschutz" | "erstehilfe" | "hygiene" | "arbeitsschutz" | "datenschutz" | "sonstiges";

interface Unterweisung {
  id: number;
  titel: string;
  inhalt: string;
  kategorie: Kategorie;
  pflicht: number | boolean;
  version: string;
  aktiv: number | boolean;
  gueltigBis?: string | null;
  created_at?: string | null;
  anzahlBestaetigt?: number | string;
  gesamtMitarbeiter?: number | string;
}

interface MitarbeiterStatus {
  mitarbeiterId: number;
  vorname: string;
  nachname: string;
  rolle?: string;
  bestaetigtAm?: string | null;
  version?: string | null;
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────
const KATEGORIE_LABELS: Record<Kategorie, { label: string; color: string; bg: string }> = {
  brandschutz:   { label: "🔥 Brandschutz",     color: "#dc2626", bg: "#fef2f2" },
  erstehilfe:    { label: "🩺 Erste Hilfe",      color: "#2563eb", bg: "#eff6ff" },
  hygiene:       { label: "🧼 Hygiene",          color: "#7c3aed", bg: "#f5f3ff" },
  arbeitsschutz: { label: "🦺 Arbeitsschutz",    color: "#d97706", bg: "#fffbeb" },
  datenschutz:   { label: "🔒 Datenschutz",      color: "#059669", bg: "#ecfdf5" },
  sonstiges:     { label: "📋 Sonstiges",        color: "#6b7280", bg: "#f9fafb" },
};

function fmtDate(d?: string | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d.split("T")[0] : "";
  if (!s) return "–";
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function fmtDateTime(d?: string | null) {
  if (!d) return "–";
  try {
    return new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
}

const btnGreen: React.CSSProperties = {
  padding: "10px 18px", background: "#4a8c3f", color: "#fff",
  border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnRed: React.CSSProperties = {
  padding: "8px 14px", background: "#dc2626", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const btnGray: React.CSSProperties = {
  padding: "8px 14px", background: "#f3f4f6", color: "#374151",
  border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, fontSize: 13, boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4, display: "block" };

// ── Hauptkomponente ────────────────────────────────────────────────────────
export function SicherheitsunterweisungenAdminTab() {
  // Daten
  const { data: unterweisungen = [], refetch } = trpc.sicherheitsunterweisung.listAdmin.useQuery();

  // UI-State
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createSheet, setCreateSheet] = useState(false);
  const [editSheet, setEditSheet] = useState(false);
  const [editData, setEditData] = useState<Unterweisung | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [filterAktiv, setFilterAktiv] = useState<"alle" | "aktiv" | "inaktiv">("aktiv");

  // Formular-State (Anlegen / Bearbeiten)
  const [fTitel, setFTitel] = useState("");
  const [fInhalt, setFInhalt] = useState("");
  const [fKategorie, setFKategorie] = useState<Kategorie>("arbeitsschutz");
  const [fPflicht, setFPflicht] = useState(true);
  const [fVersion, setFVersion] = useState("1.0");
  const [fGueltigBis, setFGueltigBis] = useState("");

  // Detail-Daten
  const { data: detailRows = [] } = trpc.sicherheitsunterweisung.bestaetigungsDetails.useQuery(
    { unterweisungId: selectedId! },
    { enabled: !!selectedId }
  ) as { data: MitarbeiterStatus[] };

  // Mutations
  const createMut = trpc.sicherheitsunterweisung.create.useMutation({
    onSuccess: () => { toast.success("✅ Unterweisung erstellt"); refetch(); setCreateSheet(false); resetForm(); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const updateMut = trpc.sicherheitsunterweisung.update.useMutation({
    onSuccess: () => { toast.success("✅ Unterweisung aktualisiert"); refetch(); setEditSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const deactivateMut = trpc.sicherheitsunterweisung.deactivate.useMutation({
    onSuccess: () => { toast.success("🚫 Unterweisung deaktiviert"); refetch(); setDeactivateId(null); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  function resetForm() {
    setFTitel(""); setFInhalt(""); setFKategorie("arbeitsschutz");
    setFPflicht(true); setFVersion("1.0"); setFGueltigBis("");
  }

  function openEdit(u: Unterweisung) {
    setEditData(u);
    setFTitel(u.titel);
    setFInhalt(u.inhalt);
    setFKategorie(u.kategorie);
    setFPflicht(Boolean(u.pflicht));
    setFVersion(u.version ?? "1.0");
    setFGueltigBis(u.gueltigBis ?? "");
    setEditSheet(true);
  }

  function openDetail(id: number) {
    setSelectedId(id);
    setView("detail");
  }

  // Gefilterte Liste
  const filtered = (unterweisungen as Unterweisung[]).filter((u) => {
    if (filterAktiv === "aktiv") return Boolean(u.aktiv);
    if (filterAktiv === "inaktiv") return !Boolean(u.aktiv);
    return true;
  });

  const selectedUnterweisung = (unterweisungen as Unterweisung[]).find((u) => u.id === selectedId);

  // Detail-Aufschlüsselung
  const nichtBestaetigt = detailRows.filter((r) => !r.bestaetigtAm);
  const bestaetigt = detailRows.filter((r) => !!r.bestaetigtAm);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "0 0 40px" }}>

      {/* ── Kopfzeile ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          {view === "detail" && (
            <button onClick={() => setView("list")} style={{ ...btnGray, marginRight: 10, fontSize: 13 }}>
              ← Zurück
            </button>
          )}
          {view === "list" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>🦺 Sicherheitsunterweisungen</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Verwaltung & Bestätigungs-Übersicht</div>
            </div>
          )}
          {view === "detail" && selectedUnterweisung && (
            <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedUnterweisung.titel}</div>
          )}
        </div>
        {view === "list" && (
          <button onClick={() => { resetForm(); setCreateSheet(true); }} style={btnGreen}>
            + Neue Unterweisung
          </button>
        )}
      </div>

      {/* ── LISTEN-ANSICHT ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {/* Filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["aktiv", "inaktiv", "alle"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterAktiv(f)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: filterAktiv === f ? "#4a8c3f" : "#f3f4f6",
                  color: filterAktiv === f ? "#fff" : "#374151",
                  border: filterAktiv === f ? "none" : "1px solid #e5e7eb",
                }}
              >
                {f === "aktiv" ? "✅ Aktiv" : f === "inaktiv" ? "🚫 Inaktiv" : "📋 Alle"}
              </button>
            ))}
          </div>

          {/* KPI-Karten */}
          {(() => {
            const aktive = (unterweisungen as Unterweisung[]).filter((u) => Boolean(u.aktiv));
            const pflicht = aktive.filter((u) => Boolean(u.pflicht));
            const gesamtMA = Number((unterweisungen as Unterweisung[])[0]?.gesamtMitarbeiter ?? 0);
            const offenCount = pflicht.reduce((sum, u) => {
              const best = Number(u.anzahlBestaetigt ?? 0);
              return sum + Math.max(0, gesamtMA - best);
            }, 0);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Aktive Unterweisungen", value: aktive.length, color: "#4a8c3f", bg: "#f0fdf4" },
                  { label: "Davon Pflicht", value: pflicht.length, color: "#d97706", bg: "#fffbeb" },
                  { label: "Offene Bestätigungen", value: offenCount, color: offenCount > 0 ? "#dc2626" : "#4a8c3f", bg: offenCount > 0 ? "#fef2f2" : "#f0fdf4" },
                ].map((k) => (
                  <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Unterweisungs-Karten */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}>
              Keine Unterweisungen gefunden.
            </div>
          ) : (
            filtered.map((u) => {
              const kat = KATEGORIE_LABELS[u.kategorie] ?? KATEGORIE_LABELS.sonstiges;
              const best = Number(u.anzahlBestaetigt ?? 0);
              const gesamt = Number(u.gesamtMitarbeiter ?? 0);
              const prozent = gesamt > 0 ? Math.round((best / gesamt) * 100) : 0;
              const isAktiv = Boolean(u.aktiv);
              const isPflicht = Boolean(u.pflicht);

              return (
                <div
                  key={u.id}
                  style={{
                    background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.07)",
                    padding: 14, marginBottom: 10,
                    opacity: isAktiv ? 1 : 0.6,
                    borderLeft: `4px solid ${isAktiv ? kat.color : "#d1d5db"}`,
                  }}
                >
                  {/* Zeile 1: Titel + Badges */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                        {u.titel}
                        {!isAktiv && <span style={{ marginLeft: 8, fontSize: 11, color: "#9ca3af" }}>(inaktiv)</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: kat.color, background: kat.bg, padding: "2px 8px", borderRadius: 20 }}>
                          {kat.label}
                        </span>
                        {isPflicht && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#d97706", background: "#fffbeb", padding: "2px 8px", borderRadius: 20 }}>
                            ⚠️ Pflicht
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 20 }}>
                          v{u.version}
                        </span>
                        {u.gueltigBis && (
                          <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 20 }}>
                            Gültig bis: {fmtDate(u.gueltigBis)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fortschrittsbalken */}
                  {isAktiv && gesamt > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 3 }}>
                        <span>Bestätigungen</span>
                        <span style={{ fontWeight: 700, color: prozent === 100 ? "#4a8c3f" : prozent >= 75 ? "#d97706" : "#dc2626" }}>
                          {best}/{gesamt} ({prozent}%)
                        </span>
                      </div>
                      <div style={{ background: "#e5e7eb", borderRadius: 99, height: 7, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99, transition: "width .4s",
                          width: `${prozent}%`,
                          background: prozent === 100 ? "#4a8c3f" : prozent >= 75 ? "#f59e0b" : "#ef4444",
                        }} />
                      </div>
                      {best < gesamt && (
                        <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3, fontWeight: 600 }}>
                          ⚠️ {gesamt - best} Mitarbeiter haben noch nicht bestätigt
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aktions-Buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={() => openDetail(u.id)}
                      style={{ ...btnGray, fontSize: 11 }}
                    >
                      👥 Bestätigungs-Details
                    </button>
                    {isAktiv && (
                      <>
                        <button onClick={() => openEdit(u)} style={{ ...btnGray, fontSize: 11 }}>
                          ✏️ Bearbeiten
                        </button>
                        <button onClick={() => setDeactivateId(u.id)} style={{ ...btnRed, fontSize: 11 }}>
                          🚫 Deaktivieren
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── DETAIL-ANSICHT ─────────────────────────────────────────────────── */}
      {view === "detail" && selectedUnterweisung && (
        <div>
          {/* Unterweisung-Info */}
          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 14, marginBottom: 16, borderLeft: "4px solid #4a8c3f" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              {KATEGORIE_LABELS[selectedUnterweisung.kategorie]?.label} · v{selectedUnterweisung.version}
              {selectedUnterweisung.gueltigBis && ` · Gültig bis: ${fmtDate(selectedUnterweisung.gueltigBis)}`}
            </div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
              {selectedUnterweisung.inhalt}
            </div>
          </div>

          {/* Fortschritt gesamt */}
          {(() => {
            const gesamt = detailRows.length;
            const best = bestaetigt.length;
            const prozent = gesamt > 0 ? Math.round((best / gesamt) * 100) : 0;
            return (
              <div style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  <span>Gesamtfortschritt</span>
                  <span style={{ color: prozent === 100 ? "#4a8c3f" : "#dc2626" }}>{best}/{gesamt} ({prozent}%)</span>
                </div>
                <div style={{ background: "#e5e7eb", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99, transition: "width .4s",
                    width: `${prozent}%`,
                    background: prozent === 100 ? "#4a8c3f" : prozent >= 75 ? "#f59e0b" : "#ef4444",
                  }} />
                </div>
              </div>
            );
          })()}

          {/* Noch nicht bestätigt */}
          {nichtBestaetigt.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>
                  ❌ {nichtBestaetigt.length} noch nicht bestätigt
                </span>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                {nichtBestaetigt.map((ma, i) => (
                  <div
                    key={ma.mitarbeiterId}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: i < nichtBestaetigt.length - 1 ? "1px solid #f3f4f6" : "none",
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "#fef2f2", color: "#dc2626",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                      }}>
                        {ma.vorname[0]}{ma.nachname[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {ma.vorname} {ma.nachname}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Ausstehend</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, background: "#fef2f2", padding: "3px 10px", borderRadius: 99 }}>
                      ❌ Offen
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bereits bestätigt */}
          {bestaetigt.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4a8c3f", marginBottom: 8 }}>
                <span style={{ background: "#f0fdf4", color: "#4a8c3f", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>
                  ✅ {bestaetigt.length} bestätigt
                </span>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                {bestaetigt.map((ma, i) => (
                  <div
                    key={ma.mitarbeiterId}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: i < bestaetigt.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "#f0fdf4", color: "#4a8c3f",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                      }}>
                        {ma.vorname[0]}{ma.nachname[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {ma.vorname} {ma.nachname}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          Bestätigt am {fmtDateTime(ma.bestaetigtAm)}
                          {ma.version && ` · v${ma.version}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#4a8c3f", fontWeight: 600, background: "#f0fdf4", padding: "3px 10px", borderRadius: 99 }}>
                      ✅ Bestätigt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailRows.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}>
              Keine aktiven Mitarbeiter gefunden.
            </div>
          )}
        </div>
      )}

      {/* ── ANLEGEN-SHEET ──────────────────────────────────────────────────── */}
      <BottomSheet open={createSheet} onClose={() => setCreateSheet(false)} title="Neue Sicherheitsunterweisung">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Titel *</label>
            <input style={inputStyle} value={fTitel} onChange={(e) => setFTitel(e.target.value)} placeholder="z.B. Brandschutzunterweisung 2025" />
          </div>
          <div>
            <label style={labelStyle}>Kategorie *</label>
            <select style={inputStyle} value={fKategorie} onChange={(e) => setFKategorie(e.target.value as Kategorie)}>
              {Object.entries(KATEGORIE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Inhalt / Text der Unterweisung *</label>
            <textarea
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              value={fInhalt}
              onChange={(e) => setFInhalt(e.target.value)}
              placeholder="Vollständiger Text der Unterweisung, den Mitarbeiter lesen und bestätigen müssen..."
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Version</label>
              <input style={inputStyle} value={fVersion} onChange={(e) => setFVersion(e.target.value)} placeholder="1.0" />
            </div>
            <div>
              <label style={labelStyle}>Gültig bis (optional)</label>
              <input type="date" style={inputStyle} value={fGueltigBis} onChange={(e) => setFGueltigBis(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", borderRadius: 8, padding: "10px 12px" }}>
            <input
              type="checkbox" id="pflicht-create"
              checked={fPflicht}
              onChange={(e) => setFPflicht(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <label htmlFor="pflicht-create" style={{ fontSize: 13, fontWeight: 600, color: "#92400e", cursor: "pointer" }}>
              ⚠️ Pflichtunterweisung (alle aktiven Mitarbeiter müssen bestätigen)
            </label>
          </div>
          <button
            onClick={() => {
              if (!fTitel.trim() || !fInhalt.trim()) { toast.error("Bitte Titel und Inhalt ausfüllen"); return; }
              createMut.mutate({
                titel: fTitel.trim(),
                inhalt: fInhalt.trim(),
                kategorie: fKategorie,
                pflicht: fPflicht,
                version: fVersion || "1.0",
                gueltigBis: fGueltigBis || undefined,
              });
            }}
            disabled={createMut.isPending}
            style={btnGreen}
          >
            {createMut.isPending ? "Erstelle…" : "✅ Unterweisung erstellen"}
          </button>
        </div>
      </BottomSheet>

      {/* ── BEARBEITEN-SHEET ───────────────────────────────────────────────── */}
      <BottomSheet open={editSheet} onClose={() => setEditSheet(false)} title="Unterweisung bearbeiten">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Titel</label>
            <input style={inputStyle} value={fTitel} onChange={(e) => setFTitel(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Kategorie</label>
            <select style={inputStyle} value={fKategorie} onChange={(e) => setFKategorie(e.target.value as Kategorie)}>
              {Object.entries(KATEGORIE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Inhalt</label>
            <textarea
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              value={fInhalt}
              onChange={(e) => setFInhalt(e.target.value)}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Version</label>
              <input style={inputStyle} value={fVersion} onChange={(e) => setFVersion(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Gültig bis</label>
              <input type="date" style={inputStyle} value={fGueltigBis} onChange={(e) => setFGueltigBis(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", borderRadius: 8, padding: "10px 12px" }}>
            <input
              type="checkbox" id="pflicht-edit"
              checked={fPflicht}
              onChange={(e) => setFPflicht(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <label htmlFor="pflicht-edit" style={{ fontSize: 13, fontWeight: 600, color: "#92400e", cursor: "pointer" }}>
              ⚠️ Pflichtunterweisung
            </label>
          </div>
          <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#1d4ed8" }}>
            💡 Wenn Sie die Version erhöhen (z.B. 1.0 → 2.0), müssen alle Mitarbeiter die Unterweisung erneut bestätigen.
          </div>
          <button
            onClick={() => {
              if (!editData) return;
              updateMut.mutate({
                id: editData.id,
                titel: fTitel.trim(),
                inhalt: fInhalt.trim(),
                kategorie: fKategorie,
                pflicht: fPflicht,
                version: fVersion,
                gueltigBis: fGueltigBis || null,
              });
            }}
            disabled={updateMut.isPending}
            style={btnGreen}
          >
            {updateMut.isPending ? "Speichern…" : "💾 Änderungen speichern"}
          </button>
        </div>
      </BottomSheet>

      {/* ── DEAKTIVIEREN-DIALOG ────────────────────────────────────────────── */}
      {deactivateId !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20,
        }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "#111827" }}>
              🚫 Unterweisung deaktivieren?
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
              Die Unterweisung wird für Mitarbeiter nicht mehr angezeigt. Bestehende Bestätigungen bleiben erhalten.
              Diese Aktion kann durch erneutes Bearbeiten rückgängig gemacht werden.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeactivateId(null)} style={{ ...btnGray, flex: 1 }}>Abbrechen</button>
              <button
                onClick={() => deactivateMut.mutate({ id: deactivateId })}
                disabled={deactivateMut.isPending}
                style={{ ...btnRed, flex: 1 }}
              >
                {deactivateMut.isPending ? "…" : "Deaktivieren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
