import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PasswordInput from "@/components/PasswordInput";

const SMTP_FELDER = [
  { key: "smtp_host", label: "SMTP-Server", beschreibung: "z.B. smtp.gmail.com oder mail.web.de", placeholder: "smtp.beispiel.de" },
  { key: "smtp_port", label: "SMTP-Port", beschreibung: "Meist 587 (TLS) oder 465 (SSL)", placeholder: "587", type: "number" },
  { key: "smtp_user", label: "SMTP-Benutzername", beschreibung: "Meist die vollständige E-Mail-Adresse", placeholder: "ihre@email.de" },
  { key: "smtp_pass", label: "SMTP-Passwort", beschreibung: "Wird verschlüsselt gespeichert und nie erneut angezeigt. Nur zum Ändern neu eingeben.", placeholder: "••••••••", type: "password" },
  { key: "smtp_from", label: "Absender-Adresse", beschreibung: "Wird als Absender in ausgehenden E-Mails angezeigt", placeholder: "portal@lebenswert-betreuung.de", type: "email" },
  { key: "steuerbuero_email", label: "E-Mail Steuerberaterin", beschreibung: "An diese Adresse werden Fahrtennachweise und Meldungen gesendet", placeholder: "steuerbuero@beispiel.de", type: "email" },
  { key: "steuerbuero_name", label: "Name Steuerbüro", beschreibung: "Name der Kanzlei oder Steuerberaterin", placeholder: "Steuerbüro Müller" },
];

export default function SmtpKonfiguration() {
  const { data: alleEinstellungen = [], refetch } = (trpc as any).einstellungen.getAll.useQuery();
  const setEinstellung = (trpc as any).einstellungen.set.useMutation();
  const [werte, setWerte] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    if (alleEinstellungen.length > 0) {
      const map: Record<string, string> = {};
      for (const e of alleEinstellungen) map[e.schluessel] = e.wert ?? "";
      setWerte(map);
    }
  }, [alleEinstellungen]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const feld of SMTP_FELDER) {
        if (werte[feld.key] !== undefined && werte[feld.key] !== "") {
          await setEinstellung.mutateAsync({ schluessel: feld.key, wert: werte[feld.key] });
        }
      }
      toast.success("✅ SMTP-Einstellungen gespeichert");
      refetch();
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestStatus("sending");
    try {
      const res = await fetch("/api/trpc/einstellungen.testSmtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setTestStatus("success");
        toast.success("✅ Test-E-Mail erfolgreich gesendet!");
      } else {
        setTestStatus("error");
        const data = await res.json().catch(() => ({}));
        toast.error("Fehler: " + (data?.error?.message ?? "Unbekannter Fehler"));
      }
    } catch (e: any) {
      setTestStatus("error");
      toast.error("Verbindungsfehler: " + e.message);
    }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, display: "block", marginBottom: 3 };
  const descStyle: React.CSSProperties = { fontSize: 11, color: "#9ca3af", margin: "0 0 6px" };

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>📧 SMTP & E-Mail-Konfiguration</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          Hier konfigurierst du den E-Mail-Versand. Ohne diese Daten können keine E-Mails (Fahrtennachweise, Steuerberater-Meldungen) versendet werden.
        </p>
      </div>

      {/* SMTP-Felder */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#1a5c38" }}>🔐 SMTP-Zugangsdaten</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {SMTP_FELDER.slice(0, 5).map((feld) => (
            <div key={feld.key} style={feld.key === "smtp_from" ? { gridColumn: "1 / -1" } : undefined}>
              <label style={labelStyle}>{feld.label}</label>
              <p style={descStyle}>{feld.beschreibung}</p>
              {feld.type === "password" ? (
                <PasswordInput
                  value={werte[feld.key] ?? ""}
                  onChange={e => setWerte(prev => ({ ...prev, [feld.key]: e.target.value }))}
                  placeholder={feld.placeholder}
                  style={inputStyle}
                />
              ) : (
                <input
                  type={feld.type ?? "text"}
                  value={werte[feld.key] ?? ""}
                  onChange={e => setWerte(prev => ({ ...prev, [feld.key]: e.target.value }))}
                  placeholder={feld.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Steuerberaterin */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#1a5c38" }}>📋 Steuerberaterin / Steuerbüro</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {SMTP_FELDER.slice(5).map((feld) => (
            <div key={feld.key}>
              <label style={labelStyle}>{feld.label}</label>
              <p style={descStyle}>{feld.beschreibung}</p>
              <input
                type={feld.type ?? "text"}
                value={werte[feld.key] ?? ""}
                onChange={e => setWerte(prev => ({ ...prev, [feld.key]: e.target.value }))}
                placeholder={feld.placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Speichern + Test */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          style={{ padding: "12px 24px", background: saving ? "#9ca3af" : "#1a5c38", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          {saving ? "⏳ Speichert…" : "💾 Alle Einstellungen speichern"}
        </button>
        <button
          onClick={handleTestEmail}
          disabled={testStatus === "sending"}
          style={{ padding: "12px 24px", background: testStatus === "sending" ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          {testStatus === "sending" ? "⏳ Sende…" : "🧪 Test-E-Mail senden"}
        </button>
      </div>

      {testStatus === "success" && (
        <div style={{ marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, fontSize: 13, color: "#166534" }}>
          ✅ Test-E-Mail wurde erfolgreich versendet. Prüfe den Posteingang der Steuerberaterin.
        </div>
      )}
      {testStatus === "error" && (
        <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, fontSize: 13, color: "#991b1b" }}>
          ❌ Fehler beim Versand. Bitte SMTP-Daten prüfen (Server, Port, Benutzername, Passwort).
        </div>
      )}

      {/* Hinweis */}
      <div style={{ marginTop: 20, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, fontSize: 12, color: "#1e40af" }}>
        <strong>Tipp:</strong> Für Gmail oder Web.de benötigst du ein App-Kennwort (nicht dein normales Passwort).
        Bei Gmail: Google-Konto → Sicherheit → App-Passwörter. Bei Web.de: Einstellungen → POP3/IMAP → Passwort für externe Programme.
      </div>

      {/* Testmodus / Reset */}
      <TestmodusReset />
    </div>
  );
}

function TestmodusReset() {
  const [bestaetigung, setBestaetigung] = useState("");
  const [resetting, setResetting] = useState(false);
  const loeschen = (trpc as any).einstellungen.testdatenLoeschen.useMutation();

  const handleReset = async () => {
    if (bestaetigung !== "RESET") {
      toast.error("Bitte 'RESET' eingeben um zu bestätigen");
      return;
    }
    setResetting(true);
    try {
      const result = await loeschen.mutateAsync({});
      toast.success(`✅ ${result.geloescht} Tabellen geleert. Alle Bewegungsdaten wurden gelöscht.`);
      setBestaetigung("");
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ marginTop: 24, background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>🧹 Testphase beenden – Alle Daten zurücksetzen</div>
      <p style={{ fontSize: 12, color: "#7f1d1d", margin: "0 0 12px" }}>
        <strong>Achtung:</strong> Dies löscht alle Einsätze, Fahrten, Leistungsnachweise, Besuchsberichte, Urlaubsanträge,
        Krankmeldungen und Benachrichtigungen. Mitarbeiter und Kunden bleiben erhalten.
        Nach dem Reset starten alle Mitarbeiter bei null.
      </p>
      <p style={{ fontSize: 12, color: "#7f1d1d", margin: "0 0 12px" }}>
        Tippe <strong>RESET</strong> ein und klicke auf den Button:
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="text"
          value={bestaetigung}
          onChange={e => setBestaetigung(e.target.value.toUpperCase())}
          placeholder="RESET eingeben"
          style={{ padding: "10px 14px", border: "2px solid #fca5a5", borderRadius: 8, fontSize: 14, fontWeight: 700, width: 160, textAlign: "center" }}
        />
        <button
          onClick={handleReset}
          disabled={resetting || bestaetigung !== "RESET"}
          style={{
            padding: "10px 20px",
            background: bestaetigung === "RESET" ? "#dc2626" : "#d1d5db",
            color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: bestaetigung === "RESET" ? "pointer" : "not-allowed",
          }}
        >
          {resetting ? "⏳ Lösche…" : "🗑️ Alle Testdaten löschen"}
        </button>
      </div>
    </div>
  );
}
