import { useState, useEffect } from "react";

const COOKIE_KEY = "lw_cookie_consent";

type ConsentState = "accepted" | "rejected" | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY) as ConsentState;
    if (stored) setConsent(stored);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setConsent("accepted");
  };

  const reject = () => {
    localStorage.setItem(COOKIE_KEY, "rejected");
    setConsent("rejected");
  };

  if (consent !== null) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--lw-white)",
        borderTop: "2px solid var(--lw-green-500)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--lw-green-700)", marginBottom: "0.25rem" }}>
            🍪 Datenschutz & Cookies
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--lw-gray-600)", lineHeight: 1.5 }}>
            Dieses Portal verwendet ausschließlich technisch notwendige Cookies für die Anmeldung und Sitzungsverwaltung.
            Es werden keine Tracking- oder Werbe-Cookies eingesetzt.
            {" "}
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{ color: "var(--lw-green-600)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "0.875rem" }}
            >
              {showDetails ? "Weniger anzeigen" : "Details anzeigen"}
            </button>
          </div>

          {showDetails && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              background: "var(--lw-green-50)",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              color: "var(--lw-gray-700)",
              lineHeight: 1.6,
            }}>
              <strong>Technisch notwendige Cookies:</strong>
              <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
                <li><code>lb_portal_token</code> – Authentifizierungstoken (30 Tage, HttpOnly)</li>
                <li><code>lw_cookie_consent</code> – Speichert Ihre Cookie-Entscheidung (localStorage)</li>
              </ul>
              <div style={{ marginTop: "0.5rem" }}>
                Diese Cookies sind für den Betrieb des Portals zwingend erforderlich und können nicht deaktiviert werden.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Verantwortlicher:</strong> Lebenswert Betreuung GmbH &bull;{" "}
                <strong>Datenschutzbeauftragter:</strong> Bitte kontaktieren Sie die Geschäftsleitung.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={reject}
            className="lw-btn lw-btn-secondary lw-btn-sm"
          >
            Nur notwendige
          </button>
          <button
            onClick={accept}
            className="lw-btn lw-btn-primary lw-btn-sm"
            style={{ background: "var(--lw-green-600)" }}
          >
            ✓ Verstanden & Akzeptieren
          </button>
        </div>
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--lw-gray-400)", borderTop: "1px solid var(--lw-gray-100)", paddingTop: "0.5rem" }}>
        Dieses Portal ist ein internes Mitarbeitersystem. Alle Daten werden DSGVO-konform verarbeitet.
        Gemäß Art. 13 DSGVO haben Sie das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit.
      </div>
    </div>
  );
}
