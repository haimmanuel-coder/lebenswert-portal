import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// Einfache Hilfsfunktion um Token aus URL zu lesen
function getTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
}

export default function ResetPasswort() {
  const [, navigate] = useLocation();
  const token = getTokenFromUrl();

  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [bestaetigung, setBestaetigung] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Token validieren
  const { data: tokenInfo, isLoading: tokenLoading } = trpc.portal.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const resetMutation = trpc.portal.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    },
    onError: (e) => setError(e.message || "Fehler beim Zurücksetzen des Passworts."),
  });

  const doReset = () => {
    setError("");
    if (!neuesPasswort || neuesPasswort.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (neuesPasswort !== bestaetigung) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    resetMutation.mutate({ token, neuesPasswort });
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 28px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 12px 40px rgba(0,0,0,.15)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 15,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#6b7280",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(150deg, #4a8c3f, #2a9d8f)",
        padding: 20,
      }}
    >
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 8 }}>🌿</span>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#4a8c3f", margin: 0 }}>
            Lebenswert Betreuung
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Passwort zurücksetzen</p>
        </div>

        {/* Kein Token in URL */}
        {!token && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#991b1b", fontSize: 14, marginBottom: 16 }}>
              ⚠️ Kein Reset-Token gefunden. Bitte nutze den Link aus der E-Mail.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{ color: "#4a8c3f", background: "none", border: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline" }}
            >
              ← Zurück zum Login
            </button>
          </div>
        )}

        {/* Token wird geprüft */}
        {token && tokenLoading && (
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14 }}>
            🔄 Link wird überprüft…
          </p>
        )}

        {/* Token ungültig */}
        {token && !tokenLoading && tokenInfo && !tokenInfo.valid && (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "12px 14px", borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
              ⛔ Dieser Reset-Link ist ungültig oder abgelaufen.<br />Bitte fordere einen neuen Link an.
            </div>
            <button
              onClick={() => navigate("/")}
              style={{ color: "#4a8c3f", background: "none", border: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline" }}
            >
              ← Zurück zum Login
            </button>
          </div>
        )}

        {/* Erfolg */}
        {success && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ color: "#4a8c3f", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Passwort geändert!</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Du wirst in 3 Sekunden zum Login weitergeleitet…</p>
          </div>
        )}

        {/* Formular */}
        {token && !tokenLoading && tokenInfo?.valid && !success && (
          <>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginBottom: 20, fontSize: 13, color: "#166534" }}>
              👋 Hallo {tokenInfo.vorname}! Bitte gib dein neues Passwort ein.
            </div>

            {error && (
              <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Neues Passwort</label>
              <input
                type="password"
                value={neuesPasswort}
                onChange={(e) => setNeuesPasswort(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              {/* Stärke-Anzeige */}
              {neuesPasswort.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: neuesPasswort.length >= i * 3
                          ? i <= 1 ? "#ef4444" : i <= 2 ? "#f59e0b" : i <= 3 ? "#84cc16" : "#22c55e"
                          : "#e5e7eb",
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Passwort bestätigen</label>
              <input
                type="password"
                value={bestaetigung}
                onChange={(e) => setBestaetigung(e.target.value)}
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && doReset()}
                style={{
                  ...inputStyle,
                  borderColor: bestaetigung && bestaetigung !== neuesPasswort ? "#ef4444" : "#e5e7eb",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
                onBlur={(e) => (e.target.style.borderColor = bestaetigung && bestaetigung !== neuesPasswort ? "#ef4444" : "#e5e7eb")}
              />
              {bestaetigung && bestaetigung !== neuesPasswort && (
                <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>Passwörter stimmen nicht überein</p>
              )}
            </div>

            <button
              onClick={doReset}
              disabled={resetMutation.isPending}
              style={{
                width: "100%",
                padding: 14,
                background: resetMutation.isPending ? "#6b9e64" : "#4a8c3f",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: resetMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {resetMutation.isPending ? "Wird gespeichert…" : "Passwort speichern"}
            </button>

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                onClick={() => navigate("/")}
                style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
              >
                ← Zurück zum Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
