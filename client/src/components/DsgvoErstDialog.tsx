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
    text: "Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner personenbezogenen Daten gemäß DSGVO zu. Die Daten werden ausschließlich für die Erbringung der Betreuungsleistungen verwendet.",
  },
  {
    typ: "avv",
    titel: "Auftragsverarbeitungsvertrag (AVV)",
    pflicht: true,
    text: "Ich bestätige, dass ich den Auftragsverarbeitungsvertrag zur Kenntnis genommen habe und die darin enthaltenen Regelungen zur Datenverarbeitung akzeptiere.",
  },
  {
    typ: "einwilligung",
    titel: "Einwilligung Datenverarbeitung",
    pflicht: true,
    text: "Ich willige ein, dass meine Kontaktdaten, Arbeitszeiten und Einsatzdaten im Portal gespeichert und verarbeitet werden dürfen.",
  },
  {
    typ: "loeschkonzept",
    titel: "Löschkonzept",
    pflicht: false,
    text: "Ich nehme zur Kenntnis, dass meine Daten gemäß dem Löschkonzept nach Beendigung des Arbeitsverhältnisses innerhalb der gesetzlichen Fristen gelöscht werden.",
  },
];

export default function DsgvoErstDialog({ onClose }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0);

  const zustimmenMut = (trpc.datenschutz as any).zustimmenByTyp.useMutation({
    onSuccess: () => {
      if (step < EINWILLIGUNGEN.length - 1) {
        setStep(s => s + 1);
      } else {
        toast.success("✅ Alle Einwilligungen gespeichert!");
        onClose();
      }
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const pflichtAlleAkzeptiert = EINWILLIGUNGEN.filter(e => e.pflicht).every(e => checked[e.typ]);

  const handleWeiter = () => {
    const aktuell = EINWILLIGUNGEN[step];
    if (!checked[aktuell.typ] && aktuell.pflicht) {
      toast.error("Bitte stimme der Pflichteinwilligung zu.");
      return;
    }
    zustimmenMut.mutate({
      typ: aktuell.typ as any,
      zugestimmt: checked[aktuell.typ] ?? false,
      version: "1.0",
    });
  };

  const aktuell = EINWILLIGUNGEN[step];
  const fortschritt = Math.round(((step) / EINWILLIGUNGEN.length) * 100);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>DSGVO-Einwilligungen</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
            Bitte bestätige die folgenden Einwilligungen, um das Portal nutzen zu können.
          </p>
        </div>

        {/* Fortschrittsbalken */}
        <div style={{ background: "#f3f4f6", borderRadius: 99, height: 6, marginBottom: 20 }}>
          <div style={{ background: "#0d9488", borderRadius: 99, height: 6, width: `${fortschritt}%`, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "right", marginTop: -16, marginBottom: 16 }}>
          {step + 1} von {EINWILLIGUNGEN.length}
        </div>

        {/* Aktuelle Einwilligung */}
        <div style={{ background: aktuell.pflicht ? "#fef3c7" : "#f9fafb", border: `2px solid ${aktuell.pflicht ? "#fbbf24" : "#e5e7eb"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{aktuell.pflicht ? "⚠️" : "ℹ️"}</span>
            <strong style={{ fontSize: 14, color: "#111827" }}>{aktuell.titel}</strong>
            {aktuell.pflicht && (
              <span style={{ background: "#fbbf24", color: "#78350f", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Pflicht</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{aktuell.text}</p>
        </div>

        {/* Checkbox */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={checked[aktuell.typ] ?? false}
            onChange={e => setChecked(c => ({ ...c, [aktuell.typ]: e.target.checked }))}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: "#0d9488", cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
            Ich stimme der <strong>{aktuell.titel}</strong> {aktuell.pflicht ? "zu (erforderlich)" : "zu (optional)"}
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {!aktuell.pflicht && (
            <button
              onClick={handleWeiter}
              style={{ padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 10, background: "#f9fafb", color: "#374151", cursor: "pointer", fontSize: 13 }}
            >
              Überspringen
            </button>
          )}
          <button
            onClick={handleWeiter}
            disabled={zustimmenMut.isPending || (aktuell.pflicht && !checked[aktuell.typ])}
            style={{
              padding: "10px 22px", border: "none", borderRadius: 10,
              background: (aktuell.pflicht && !checked[aktuell.typ]) ? "#d1d5db" : "#0d9488",
              color: "#fff", cursor: (aktuell.pflicht && !checked[aktuell.typ]) ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700,
            }}
          >
            {zustimmenMut.isPending ? "Speichere..." : step === EINWILLIGUNGEN.length - 1 ? "✅ Fertigstellen" : "Weiter →"}
          </button>
        </div>

        {/* Datenschutz-Hinweis */}
        <p style={{ margin: "16px 0 0", fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
          Deine Einwilligungen werden DSGVO-konform gespeichert und können jederzeit unter „Datenschutz" widerrufen werden.
        </p>
      </div>
    </div>
  );
}
