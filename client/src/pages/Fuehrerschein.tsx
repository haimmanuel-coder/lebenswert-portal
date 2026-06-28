import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
// Einfache Hilfsfunktion: Datum + 6 Monate
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function statusBadge(status: string, naechstesPruefDatum: string) {
  const today = new Date().toISOString().split("T")[0];
  const daysLeft = Math.ceil((new Date(naechstesPruefDatum).getTime() - new Date(today).getTime()) / 86400000);
  if (daysLeft < 0) return { label: "Überfällig", bg: "#fee2e2", color: "#dc2626", icon: "🔴" };
  if (daysLeft <= 30) return { label: `Fällig in ${daysLeft} Tagen`, bg: "#fef3c7", color: "#d97706", icon: "🟡" };
  return { label: "Gültig", bg: "#d1fae5", color: "#166534", icon: "🟢" };
}

export default function Fuehrerschein() {
  const today = new Date().toISOString().split("T")[0];
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pruefDatum, setPruefDatum] = useState(today);
  const [bemerkung, setBemerkung] = useState("");
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { data: checks = [], refetch, isLoading: checksLoading, isError: checksError } = trpc.fuehrerschein.list.useQuery();
  const createCheck = trpc.fuehrerschein.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Führerschein-Check gespeichert");
      setSheetOpen(false);
      setFotoPreview(null);
      setFotoFile(null);
      setBemerkung("");
      setPruefDatum(today);
      refetch();
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const handleFotoChange = (file: File | null) => {
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!pruefDatum) { toast.error("Bitte Prüfdatum angeben"); return; }
    setUploading(true);
    try {
      let fotoUrl: string | undefined;
      let fotoKey: string | undefined;
      if (fotoFile) {
        const arrayBuffer = await fotoFile.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        // Foto direkt als Base64 speichern (kein S3 nötig für kleine Bilder)
        fotoUrl = fotoPreview ?? undefined;
        fotoKey = `fuehrerschein-${Date.now()}`;
      }
      createCheck.mutate({
        pruefDatum,
        naechstesPruefDatum: addMonths(pruefDatum, 6),
        bemerkung,
        fotoUrl,
        fotoKey,
      });
    } finally {
      setUploading(false);
    }
  };

  const checksArr = Array.isArray(checks) ? checks : [];

  return (
    <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>🪪 Führerschein-Kontrolle</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Halbjährliche Prüfung – gesetzlich vorgeschrieben</p>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          style={{ background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          + Neue Prüfung
        </button>
      </div>

      {/* Info-Banner */}
      <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#1e40af" }}>
        <strong>📋 Gesetzliche Pflicht:</strong> Mitarbeiter mit Firmenwagen müssen alle 6 Monate ihren Führerschein vorlegen. Foto-Upload dient als digitaler Nachweis.
      </div>

      {/* Checks-Liste */}
      {checksLoading ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <div>Lade Führerschein-Prüfungen...</div>
        </div>
      ) : checksError ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "#dc2626", background: "#fee2e2", borderRadius: 10 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
          <div style={{ fontWeight: 700 }}>Fehler beim Laden</div>
          <button onClick={() => refetch()} style={{ marginTop: 10, padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Erneut versuchen</button>
        </div>
      ) : checksArr.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🪪</div>
          <div style={{ fontWeight: 600 }}>Noch keine Führerschein-Prüfung erfasst</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Klicke auf „+ Neue Prüfung" um zu starten</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {checksArr.map((c: any) => {
            const badge = statusBadge(c.status, c.naechstes_pruef_datum);
            return (
              <div key={c.id} style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {c.foto_url ? (
                    <img src={c.foto_url} alt="Führerschein-Foto" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 44, background: "#f3f4f6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🪪</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>
                      <strong>Geprüft am:</strong> {new Date(c.pruef_datum).toLocaleDateString("de-DE")}
                    </div>
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      <strong>Nächste Prüfung:</strong> {new Date(c.naechstes_pruef_datum).toLocaleDateString("de-DE")}
                    </div>
                    {c.bemerkung && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{c.bemerkung}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet – Neue Prüfung */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
          <div onClick={() => setSheetOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: "#d1d5db", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a2e1a", marginBottom: 18 }}>Neue Führerschein-Prüfung</h2>

            {/* Foto-Upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Foto des Führerscheins</label>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => cameraRef.current?.click()}
                  style={{ flex: 1, padding: "12px 8px", background: "#f0fdf4", border: "2px dashed #86efac", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#166534", cursor: "pointer" }}
                >
                  📷 Kamera
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ flex: 1, padding: "12px 8px", background: "#eff6ff", border: "2px dashed #93c5fd", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#1e40af", cursor: "pointer" }}
                >
                  🖼️ Galerie
                </button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)} />
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)} />
              {fotoPreview && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={fotoPreview} alt="Vorschau" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: "2px solid #86efac" }} />
                  <button onClick={() => { setFotoPreview(null); setFotoFile(null); }} style={{ position: "absolute", top: 6, right: 6, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>
              )}
            </div>

            {/* Prüfdatum */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Prüfdatum *</label>
              <input type="date" value={pruefDatum} onChange={(e) => setPruefDatum(e.target.value)} style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              {pruefDatum && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Nächste Prüfung: <strong>{new Date(addMonths(pruefDatum, 6)).toLocaleDateString("de-DE")}</strong>
                </div>
              )}
            </div>

            {/* Bemerkung */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Bemerkung (optional)</label>
              <textarea value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="z.B. Klasse B, Ausstellungsort..." style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", resize: "none", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSheetOpen(false)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={handleSave} disabled={createCheck.isPending || uploading} style={{ flex: 2, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {createCheck.isPending || uploading ? "Speichern..." : "✅ Prüfung speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
