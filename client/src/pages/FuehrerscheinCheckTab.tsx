/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FÜHRERSCHEIN-CHECK – Admin-Tab
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Halbjährliche Führerscheinprüfung für Mitarbeiter mit Firmenfahrzeug.
 * Funktionen:
 *  • Übersicht aller Mitarbeiter mit Prüfstatus (Ampel-System)
 *  • Neuen Check erfassen (Datum, Status, Foto-Upload, Bemerkung)
 *  • Nächste Prüfung automatisch +6 Monate berechnen
 *  • Überfällige Prüfungen rot hervorheben
 *  • Verlauf pro Mitarbeiter
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";

// ── Typen ──────────────────────────────────────────────────────────────────
type CheckStatus = "ausstehend" | "bestanden" | "abgelaufen";

interface FuehrerscheinCheck {
  id: number;
  mitarbeiterId: number;
  pruefDatum: string;
  naechstePruefung: string;
  status: CheckStatus;
  fotoUrl?: string | null;
  bemerkung?: string | null;
  geprueftVonId?: number | null;
  created_at?: string | null;
  vorname?: string;
  nachname?: string;
}

interface MitarbeiterMitCheck {
  id: number;
  vorname: string;
  nachname: string;
  beschaeftigungsart?: string;
  letzterCheck?: FuehrerscheinCheck | null;
  naechstePruefung?: string | null;
  status?: CheckStatus | "kein_check";
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "–";
  try {
    const s = typeof d === "string" ? d.split("T")[0] : "";
    if (!s) return "–";
    const [y, m, day] = s.split("-");
    return `${day}.${m}.${y}`;
  } catch { return "–"; }
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function isUeberfaellig(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr.split("T")[0]) < new Date();
}

function daysUntil(dateStr?: string | null): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr.split("T")[0]).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<CheckStatus | "kein_check", { label: string; color: string; bg: string; dot: string }> = {
  bestanden:   { label: "✅ Bestanden",   color: "#4a8c3f", bg: "#f0fdf4", dot: "#4a8c3f" },
  ausstehend:  { label: "⏳ Ausstehend",  color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  abgelaufen:  { label: "❌ Abgelaufen",  color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  kein_check:  { label: "🔲 Kein Check",  color: "#6b7280", bg: "#f9fafb", dot: "#9ca3af" },
};

const btnGreen: React.CSSProperties = {
  padding: "10px 18px", background: "#4a8c3f", color: "#fff",
  border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGray: React.CSSProperties = {
  padding: "8px 14px", background: "#f3f4f6", color: "#374151",
  border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, fontSize: 13, boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4, display: "block",
};

// ── Hauptkomponente ────────────────────────────────────────────────────────
export function FuehrerscheinCheckTab() {
  const { data: maListe = [], refetch } = trpc.fuehrerschein.listMitStatus.useQuery();
  const { data: alleChecks = [] } = trpc.fuehrerschein.alleChecks.useQuery();

  const [view, setView] = useState<"list" | "verlauf">("list");
  const [selectedMaId, setSelectedMaId] = useState<number | null>(null);
  const [checkSheet, setCheckSheet] = useState(false);
  const [checkMaId, setCheckMaId] = useState<number | null>(null);

  // Formular
  const [fDatum, setFDatum] = useState(new Date().toISOString().split("T")[0]);
  const [fStatus, setFStatus] = useState<CheckStatus>("bestanden");
  const [fBemerkung, setFBemerkung] = useState("");
  const [fFotoUrl, setFFotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createCheck = trpc.fuehrerschein.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("✅ Führerschein-Check gespeichert");
      refetch();
      setCheckSheet(false);
      resetForm();
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const uploadFoto = trpc.fuehrerschein.uploadFoto.useMutation({
    onSuccess: (data: { url: string; key: string }) => {
      setFFotoUrl(data.url);
      setUploading(false);
      toast.success("📷 Foto hochgeladen");
    },
    onError: (e: { message: string }) => { setUploading(false); toast.error("❌ Upload: " + e.message); },
  });

  function resetForm() {
    setFDatum(new Date().toISOString().split("T")[0]);
    setFStatus("bestanden");
    setFBemerkung("");
    setFFotoUrl("");
  }

  function openCheckSheet(maId: number) {
    setCheckMaId(maId);
    resetForm();
    setCheckSheet(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max. 5 MB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFoto.mutate({ base64, mimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  }

  const maListe2 = maListe as MitarbeiterMitCheck[];
  const selectedMa = maListe2.find((m) => m.id === selectedMaId);
  const verlaufChecks = (alleChecks as FuehrerscheinCheck[]).filter((c) => c.mitarbeiterId === selectedMaId);

  // KPI
  const bestanden = maListe2.filter((m) => m.status === "bestanden" && !isUeberfaellig(m.naechstePruefung)).length;
  const ueberfaellig = maListe2.filter((m) => m.status === "abgelaufen" || isUeberfaellig(m.naechstePruefung)).length;
  const keinCheck = maListe2.filter((m) => !m.letzterCheck).length;

  return (
    <div style={{ padding: "0 0 40px" }}>

      {/* Kopfzeile */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          {view === "verlauf" && (
            <button onClick={() => setView("list")} style={{ ...btnGray, marginRight: 10 }}>← Zurück</button>
          )}
          {view === "list" ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>🪪 Führerschein-Checks</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Halbjährliche Prüfung – Übersicht & Verwaltung</div>
            </div>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {selectedMa ? `${selectedMa.vorname} ${selectedMa.nachname} – Verlauf` : "Verlauf"}
            </div>
          )}
        </div>
      </div>

      {/* ── LISTEN-ANSICHT ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {/* KPI-Karten */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Gültig & Bestanden", value: bestanden, color: "#4a8c3f", bg: "#f0fdf4" },
              { label: "Überfällig / Abgelaufen", value: ueberfaellig, color: ueberfaellig > 0 ? "#dc2626" : "#4a8c3f", bg: ueberfaellig > 0 ? "#fef2f2" : "#f0fdf4" },
              { label: "Noch kein Check", value: keinCheck, color: keinCheck > 0 ? "#d97706" : "#4a8c3f", bg: keinCheck > 0 ? "#fffbeb" : "#f0fdf4" },
            ].map((k) => (
              <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Hinweis */}
          <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#1d4ed8" }}>
            ℹ️ Führerschein-Checks sind halbjährlich (alle 6 Monate) für alle Mitarbeiter mit Firmenfahrzeug durchzuführen.
          </div>

          {/* Mitarbeiter-Liste */}
          {maListe2.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}>
              Keine Mitarbeiter gefunden.
            </div>
          ) : (
            maListe2.map((ma) => {
              const tage = daysUntil(ma.naechstePruefung);
              const ueberfaelligMa = ma.letzterCheck && isUeberfaellig(ma.naechstePruefung);
              const baldFaellig = !ueberfaelligMa && tage <= 30 && tage > 0;
              const cfg = STATUS_CONFIG[ueberfaelligMa ? "abgelaufen" : (ma.status ?? "kein_check")];

              return (
                <div
                  key={ma.id}
                  style={{
                    background: "#fff", borderRadius: 12,
                    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
                    padding: 14, marginBottom: 10,
                    borderLeft: `4px solid ${ueberfaelligMa ? "#ef4444" : baldFaellig ? "#f59e0b" : cfg.dot}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: cfg.bg, color: cfg.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700,
                      }}>
                        {ma.vorname[0]}{ma.nachname[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                          {ma.vorname} {ma.nachname}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {ma.beschaeftigungsart === "vollzeit" ? "🟢 Vollzeit" : ma.beschaeftigungsart === "teilzeit" ? "🔵 Teilzeit" : "🟣 Minijob"}
                        </div>
                      </div>
                    </div>
                    {/* Status-Badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                      background: cfg.bg, color: cfg.color,
                    }}>
                      {ueberfaelligMa ? "❌ Überfällig" : cfg.label}
                    </span>
                  </div>

                  {/* Prüf-Info */}
                  {ma.letzterCheck ? (
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>Letzter Check</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(ma.letzterCheck.pruefDatum)}</div>
                      </div>
                      <div style={{
                        background: ueberfaelligMa ? "#fef2f2" : baldFaellig ? "#fffbeb" : "#f0fdf4",
                        borderRadius: 8, padding: "8px 10px",
                      }}>
                        <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>Nächste Prüfung</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ueberfaelligMa ? "#dc2626" : baldFaellig ? "#d97706" : "#4a8c3f" }}>
                          {fmtDate(ma.naechstePruefung)}
                          {ueberfaelligMa && <span style={{ fontSize: 10, marginLeft: 4 }}>({Math.abs(tage)}d überfällig)</span>}
                          {baldFaellig && <span style={{ fontSize: 10, marginLeft: 4 }}>({tage}d)</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, background: "#fffbeb", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
                      ⚠️ Noch kein Führerschein-Check erfasst
                    </div>
                  )}

                  {/* Aktionen */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => openCheckSheet(ma.id)} style={{ ...btnGreen, fontSize: 11, padding: "7px 14px" }}>
                      + Check erfassen
                    </button>
                    <button
                      onClick={() => { setSelectedMaId(ma.id); setView("verlauf"); }}
                      style={{ ...btnGray, fontSize: 11 }}
                    >
                      📋 Verlauf
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── VERLAUF-ANSICHT ────────────────────────────────────────────────── */}
      {view === "verlauf" && selectedMa && (
        <div>
          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 14, marginBottom: 16, borderLeft: "4px solid #4a8c3f" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedMa.vorname} {selectedMa.nachname}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Alle Führerschein-Checks in chronologischer Reihenfolge</div>
          </div>

          {verlaufChecks.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}>
              Noch keine Checks erfasst.
            </div>
          ) : (
            verlaufChecks.sort((a, b) => b.pruefDatum.localeCompare(a.pruefDatum)).map((c, i) => {
              const cfg = STATUS_CONFIG[c.status];
              return (
                <div key={c.id} style={{
                  background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
                  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                  borderLeft: `4px solid ${cfg.dot}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Check #{verlaufChecks.length - i}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        Prüfdatum: {fmtDate(c.pruefDatum)} · Nächste: {fmtDate(c.naechstePruefung)}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  {c.bemerkung && (
                    <div style={{ marginTop: 8, background: "#f9fafb", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#374151" }}>
                      💬 {c.bemerkung}
                    </div>
                  )}
                  {c.fotoUrl && (
                    <div style={{ marginTop: 8 }}>
                      <a href={c.fotoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#4a8c3f", fontWeight: 600 }}>
                        📷 Foto ansehen
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <button onClick={() => openCheckSheet(selectedMa.id)} style={{ ...btnGreen, marginTop: 8 }}>
            + Neuen Check erfassen
          </button>
        </div>
      )}

      {/* ── CHECK-ERFASSEN-SHEET ───────────────────────────────────────────── */}
      <BottomSheet
        open={checkSheet}
        onClose={() => { setCheckSheet(false); resetForm(); }}
        title={`Führerschein-Check: ${maListe2.find((m) => m.id === checkMaId)?.vorname ?? ""} ${maListe2.find((m) => m.id === checkMaId)?.nachname ?? ""}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Status */}
          <div>
            <label style={labelStyle}>Ergebnis *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["bestanden", "ausstehend", "abgelaufen"] as CheckStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setFStatus(s)}
                    style={{
                      flex: 1, padding: "9px 6px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: fStatus === s ? `2px solid ${cfg.color}` : "2px solid #e5e7eb",
                      background: fStatus === s ? cfg.bg : "#fff",
                      color: fStatus === s ? cfg.color : "#6b7280",
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Datum */}
          <div>
            <label style={labelStyle}>Prüfdatum *</label>
            <input type="date" style={inputStyle} value={fDatum} onChange={(e) => setFDatum(e.target.value)} />
          </div>

          {/* Nächste Prüfung (auto) */}
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#4a8c3f" }}>
            📅 Nächste Prüfung wird automatisch auf <strong>{fmtDate(addMonths(fDatum, 6))}</strong> gesetzt (+6 Monate)
          </div>

          {/* Foto-Upload */}
          <div>
            <label style={labelStyle}>Foto des Führerscheins (optional, max. 5 MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ ...btnGray, flex: 1, textAlign: "center" as const }}
              >
                {uploading ? "⏳ Lädt hoch…" : fFotoUrl ? "📷 Foto ersetzen" : "📷 Foto aufnehmen / auswählen"}
              </button>
              {fFotoUrl && (
                <a href={fFotoUrl} target="_blank" rel="noreferrer" style={{ ...btnGray, textDecoration: "none", display: "flex", alignItems: "center" }}>
                  👁️ Ansehen
                </a>
              )}
            </div>
            {fFotoUrl && (
              <div style={{ fontSize: 11, color: "#4a8c3f", marginTop: 4 }}>✅ Foto hochgeladen</div>
            )}
          </div>

          {/* Bemerkung */}
          <div>
            <label style={labelStyle}>Bemerkung (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
              value={fBemerkung}
              onChange={(e) => setFBemerkung(e.target.value)}
              placeholder="z.B. Führerschein gültig bis 2030, keine Eintragungen..."
            />
          </div>

          <button
            onClick={() => {
              if (!checkMaId || !fDatum) { toast.error("Bitte Datum ausfüllen"); return; }
              createCheck.mutate({
                mitarbeiterId: checkMaId!,
                pruefDatum: fDatum,
                naechstePruefung: addMonths(fDatum, 6),
                status: fStatus,
                fotoUrl: fFotoUrl || undefined,
                bemerkung: fBemerkung || undefined,
              });
            }}
            disabled={createCheck.isPending || uploading}
            style={btnGreen}
          >
            {createCheck.isPending ? "Speichern…" : "✅ Check speichern"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
