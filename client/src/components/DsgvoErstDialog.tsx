import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

const EINWILLIGUNGEN = [
  {
    typ: "datenschutzerklaerung",
    titel: "Datenschutzerklärung",
    pflicht: true,
    icon: "📋",
    text: "Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner personenbezogenen Daten gemäß DSGVO zu. Die Daten werden ausschließlich für die Erbringung der Betreuungsleistungen verwendet.",
    pdfName: "Datenschutzerklaerung_Lebenswert_Betreuung.txt",
  },
  {
    typ: "avv",
    titel: "Auftragsverarbeitungsvertrag (AVV)",
    pflicht: true,
    icon: "📝",
    text: "Ich bestätige, dass ich den Auftragsverarbeitungsvertrag zur Kenntnis genommen habe und die darin enthaltenen Regelungen zur Datenverarbeitung akzeptiere.",
    pdfName: "AVV_Lebenswert_Betreuung.txt",
  },
  {
    typ: "einwilligung",
    titel: "Einwilligung Datenverarbeitung",
    pflicht: true,
    icon: "✅",
    text: "Ich willige ein, dass meine Kontaktdaten, Arbeitszeiten und Einsatzdaten im Portal gespeichert und verarbeitet werden dürfen.",
    pdfName: "Einwilligung_Datenverarbeitung.txt",
  },
  {
    typ: "loeschkonzept",
    titel: "Löschkonzept",
    pflicht: false,
    icon: "🗑️",
    text: "Ich nehme zur Kenntnis, dass meine Daten gemäß dem Löschkonzept nach Beendigung des Arbeitsverhältnisses innerhalb der gesetzlichen Fristen gelöscht werden.",
    pdfName: "Loeschkonzept_Lebenswert_Betreuung.txt",
  },
];

export default function DsgvoErstDialog({ onClose }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  const zustimmenMut = (trpc.datenschutz as any).zustimmenByTyp.useMutation({
    onSuccess: () => {
      if (step < EINWILLIGUNGEN.length - 1) {
        setStep(s => s + 1);
      } else {
        toast.success("Alle Einwilligungen gespeichert. Willkommen im Portal!");
        onClose();
      }
    },
    onError: (e: any) => toast.error("Fehler: " + e.message),
  });

  const handleWeiter = () => {
    const aktuell = EINWILLIGUNGEN[step];
    if (!checked[aktuell.typ] && aktuell.pflicht) {
      toast.error("Bitte stimme der Pflichteinwilligung zu, um fortzufahren.");
      return;
    }
    zustimmenMut.mutate({
      typ: aktuell.typ as any,
      zugestimmt: checked[aktuell.typ] ?? false,
      version: "1.0",
    });
  };

  const handleDownload = () => {
    const aktuell = EINWILLIGUNGEN[step];
    setPdfLoading(true);
    try {
      const datum = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      const content = [
        "LEBENSWERT BETREUUNG",
        "═══════════════════════════════════════",
        "",
        aktuell.titel.toUpperCase(),
        "───────────────────────────────────────",
        "",
        aktuell.text,
        "",
        "───────────────────────────────────────",
        `Datum: ${datum}`,
        "Dieses Dokument wurde automatisch aus dem Mitarbeiter-Portal generiert.",
        "Lebenswert Betreuung · DSGVO-konform",
      ].join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = aktuell.pdfName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Dokument heruntergeladen.");
    } catch {
      toast.error("Download fehlgeschlagen.");
    } finally {
      setPdfLoading(false);
    }
  };

  const aktuell = EINWILLIGUNGEN[step];
  const istLetzterSchritt = step === EINWILLIGUNGEN.length - 1;
  const fortschrittProzent = Math.round((step / EINWILLIGUNGEN.length) * 100);
  const btnDisabled = zustimmenMut.isPending || (aktuell.pflicht && !checked[aktuell.typ]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.75)",
      zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        maxWidth: 560,
        width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}>

        {/* ── Grüner Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #065f46 0%, #0d9488 100%)",
          padding: "22px 26px 18px",
          color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>🔐</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>
                DSGVO-Einwilligungen
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>
                Bitte bestätige alle Dokumente, um das Portal zu nutzen.
              </p>
            </div>
          </div>

          {/* Schritt-Punkte */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 10 }}>
            {EINWILLIGUNGEN.map((e, i) => (
              <div key={e.typ} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  width: i === step ? 32 : 22,
                  height: 22,
                  borderRadius: 99,
                  background: i < step ? "#34d399" : i === step ? "#fff" : "rgba(255,255,255,0.3)",
                  color: i < step ? "#065f46" : i === step ? "#065f46" : "rgba(255,255,255,0.7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: i < step ? 11 : 10,
                  fontWeight: 800,
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                {i < EINWILLIGUNGEN.length - 1 && (
                  <div style={{
                    height: 2, width: 24,
                    background: i < step ? "#34d399" : "rgba(255,255,255,0.25)",
                    transition: "background 0.3s ease",
                  }} />
                )}
              </div>
            ))}
            <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.9, fontWeight: 600 }}>
              Schritt {step + 1} / {EINWILLIGUNGEN.length}
            </span>
          </div>

          {/* Fortschrittsbalken */}
          <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 99, height: 5 }}>
            <div style={{
              background: "#34d399",
              borderRadius: 99,
              height: 5,
              width: `${fortschrittProzent}%`,
              transition: "width 0.5s cubic-bezier(0.23,1,0.32,1)",
            }} />
          </div>
        </div>

        {/* ── Inhalt ── */}
        <div style={{ padding: "22px 26px" }}>

          {/* Dokument-Karte */}
          <div style={{
            background: aktuell.pflicht ? "#fffbeb" : "#f0fdf4",
            border: `2px solid ${aktuell.pflicht ? "#fbbf24" : "#86efac"}`,
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 16,
          }}>
            {/* Karten-Header mit Download-Button */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{aktuell.icon}</span>
                <div>
                  <strong style={{ fontSize: 14, color: "#111827", display: "block" }}>{aktuell.titel}</strong>
                  <span style={{
                    display: "inline-block", marginTop: 3,
                    background: aktuell.pflicht ? "#fef3c7" : "#dcfce7",
                    color: aktuell.pflicht ? "#92400e" : "#166534",
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 99,
                    border: `1px solid ${aktuell.pflicht ? "#fbbf24" : "#86efac"}`,
                  }}>
                    {aktuell.pflicht ? "Pflichtfeld" : "Optional"}
                  </span>
                </div>
              </div>

              {/* PDF-Download-Button */}
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                title="Dokument herunterladen"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px",
                  background: "#fff",
                  border: "1.5px solid #d1d5db",
                  borderRadius: 8,
                  cursor: pdfLoading ? "wait" : "pointer",
                  fontSize: 12, color: "#374151", fontWeight: 600,
                  whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {pdfLoading
                  ? <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #0d9488", borderTopColor: "transparent", borderRadius: "50%", animation: "dsgvo-spin 0.8s linear infinite" }} />
                  : <span>⬇</span>
                }
                Herunterladen
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
              {aktuell.text}
            </p>
          </div>

          {/* Checkbox-Zustimmung */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            cursor: "pointer",
            padding: "13px 15px",
            background: checked[aktuell.typ] ? "#f0fdf4" : "#f9fafb",
            border: `2px solid ${checked[aktuell.typ] ? "#22c55e" : "#e5e7eb"}`,
            borderRadius: 12,
            marginBottom: 18,
            transition: "all 0.2s ease",
          }}>
            <input
              type="checkbox"
              checked={checked[aktuell.typ] ?? false}
              onChange={e => setChecked(c => ({ ...c, [aktuell.typ]: e.target.checked }))}
              style={{ width: 20, height: 20, marginTop: 1, accentColor: "#0d9488", cursor: "pointer", flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.55 }}>
              Ich habe die <strong>{aktuell.titel}</strong> gelesen und stimme{" "}
              {aktuell.pflicht
                ? <strong style={{ color: "#dc2626" }}>zu (erforderlich)</strong>
                : <span style={{ color: "#6b7280" }}>zu (optional)</span>
              }.
            </span>
          </label>

          {/* Aktions-Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Zurück-Button */}
            <div>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#6b7280", fontSize: 13, padding: "4px 0",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  ← Zurück
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {!aktuell.pflicht && (
                <button
                  onClick={handleWeiter}
                  style={{
                    padding: "11px 18px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                  }}
                >
                  Überspringen
                </button>
              )}
              <button
                onClick={handleWeiter}
                disabled={btnDisabled}
                style={{
                  padding: "11px 24px",
                  border: "none",
                  borderRadius: 10,
                  background: btnDisabled
                    ? "#d1d5db"
                    : istLetzterSchritt
                    ? "linear-gradient(135deg, #065f46, #0d9488)"
                    : "#0d9488",
                  color: "#fff",
                  cursor: btnDisabled ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700,
                  boxShadow: btnDisabled ? "none" : "0 4px 12px rgba(13,148,136,0.35)",
                  transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {zustimmenMut.isPending
                  ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "dsgvo-spin 0.8s linear infinite" }} /> Speichere...</>
                  : istLetzterSchritt ? "✅ Fertigstellen" : "Weiter →"
                }
              </button>
            </div>
          </div>

          {/* DSGVO-Hinweis */}
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.5 }}>
            🔒 Einwilligungen werden DSGVO-konform gespeichert und können unter{" "}
            <strong>Einstellungen → Datenschutz</strong> jederzeit widerrufen werden.
          </p>
        </div>
      </div>

      <style>{`@keyframes dsgvo-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
