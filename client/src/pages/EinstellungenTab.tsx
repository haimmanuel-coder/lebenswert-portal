import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const EINSTELLUNGEN_LABELS: Record<string, { label: string; beschreibung: string; type?: string }> = {
  steuerberater_email: { label: "Steuerberater E-Mail", beschreibung: "E-Mail für automatische Knappschaft-Meldungen nach MA-Anlegen", type: "email" },
  steuerberater_name:  { label: "Steuerberater / Kanzlei", beschreibung: "Name des Steuerberaters oder der Kanzlei" },
  firma_name:          { label: "Firmenname", beschreibung: "Wird als Absender in E-Mails verwendet" },
  firma_email:         { label: "Firmen-E-Mail (Absender)", beschreibung: "Absender-Adresse für ausgehende E-Mails", type: "email" },
};

export default function EinstellungenTab() {
  const { data: alleEinstellungen = [], refetch } = (trpc as any).einstellungen.getAll.useQuery();
  const setEinstellung = (trpc as any).einstellungen.set.useMutation();
  const testMail = (trpc as any).einstellungen.testSteuerberaterMail.useMutation();
  const { data: maList = [] } = (trpc as any).admin.mitarbeiterList.useQuery();

  const [werte, setWerte] = useState<Record<string, string>>({});
  const [testMaId, setTestMaId] = useState<number | "">("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (alleEinstellungen.length > 0) {
      const map: Record<string, string> = {};
      for (const e of alleEinstellungen) map[e.schluessel] = e.wert ?? "";
      setWerte(map);
    }
  }, [alleEinstellungen]);

  const handleSave = async (schluessel: string) => {
    setSaving(schluessel);
    try {
      await setEinstellung.mutateAsync({ schluessel, wert: werte[schluessel] ?? "" });
      toast.success("✅ Gespeichert");
      refetch();
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleTestMail = async () => {
    if (!testMaId) { toast.error("Bitte einen Mitarbeiter auswählen"); return; }
    try {
      const result = await testMail.mutateAsync({ mitarbeiterId: Number(testMaId) });
      toast.success(`✅ Test-E-Mail gesendet an ${result.to}`);
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>⚙️ System-Einstellungen</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Konfiguriere E-Mail-Empfänger und Firmendaten für automatische Benachrichtigungen.</p>
      </div>

      {/* E-Mail-Einstellungen */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#1a5c38" }}>📧 E-Mail-Konfiguration</div>
        {Object.entries(EINSTELLUNGEN_LABELS).map(([key, meta]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{meta.label}</label>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 6px" }}>{meta.beschreibung}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={meta.type ?? "text"}
                value={werte[key] ?? ""}
                onChange={e => setWerte(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={meta.type === "email" ? "name@beispiel.de" : meta.label}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13 }}
              />
              <button
                onClick={() => handleSave(key)}
                disabled={saving === key}
                style={{ padding: "8px 14px", background: saving === key ? "#9ca3af" : "#1a5c38", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {saving === key ? "⏳" : "💾 Speichern"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SMTP-Hinweis */}
      <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>⚠️ SMTP-Konfiguration erforderlich</div>
        <p style={{ fontSize: 12, color: "#92400e", margin: 0 }}>
          Damit E-Mails versendet werden können, müssen die SMTP-Zugangsdaten als Umgebungsvariablen gesetzt sein:<br />
          <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SMTP_HOST</code>,{" "}
          <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SMTP_PORT</code>,{" "}
          <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SMTP_USER</code>,{" "}
          <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SMTP_PASS</code>,{" "}
          <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SMTP_FROM</code>
          <br /><br />
          Diese werden in den Projekt-Secrets (⚙️ Einstellungen → Secrets) hinterlegt.
        </p>
      </div>

      {/* Test-E-Mail */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#1a5c38" }}>🧪 Test-E-Mail senden</div>
        <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 12px" }}>
          Sende eine Test-Meldung für einen bestehenden Mitarbeiter an den konfigurierten Steuerberater.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={testMaId}
            onChange={e => setTestMaId(e.target.value ? Number(e.target.value) : "")}
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13 }}
          >
            <option value="">– Mitarbeiter auswählen –</option>
            {maList.map((ma: any) => (
              <option key={ma.id} value={ma.id}>{ma.vorname} {ma.nachname}</option>
            ))}
          </select>
          <button
            onClick={handleTestMail}
            disabled={testMail.isPending}
            style={{ padding: "8px 16px", background: testMail.isPending ? "#9ca3af" : "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {testMail.isPending ? "⏳ Sende…" : "📧 Test-Mail senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
