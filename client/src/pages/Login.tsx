import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth, setStoredToken } from "@/contexts/PortalAuthContext";

type View = "login" | "mfa" | "reset-request" | "reset-sent";

export default function Login() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [otp, setOtp] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [resetResult, setResetResult] = useState<{ token?: string; name?: string } | null>(null);
  const { refetch } = usePortalAuth();

  // ── Login ──────────────────────────────────────────
  const loginMutation = trpc.portal.login.useMutation({
    onSuccess: async (data) => {
      if (data.requiresTwoFactor) {
        setView("mfa");
        setError("");
        return;
      }
      if (data.token) setStoredToken(data.token);
      await new Promise((r) => setTimeout(r, 100));
      await refetch();
    },
    onError: (e) => {
      const msg = e.message || "";
      if (msg.includes("JSON") || msg.includes("token") || msg.includes("html")) {
        setError("Verbindungsfehler – bitte Seite neu laden und erneut versuchen.");
      } else {
        setError(msg || "E-Mail oder Passwort ungültig.");
      }
    },
  });

  const doLogin = () => {
    setError("");
    if (!email || !passwort) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    loginMutation.mutate({ email: email.trim().toLowerCase(), passwort, ...(otp ? { otp } : {}) });
  };

  // ── Passwort-Reset anfordern ───────────────────────
  const resetMutation = trpc.portal.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setResetResult({ token: data.resetToken, name: data.mitarbeiterName });
      setView("reset-sent");
    },
    onError: (e) => setError(e.message || "Fehler beim Anfordern des Reset-Links."),
  });

  const doRequestReset = () => {
    setError("");
    if (!resetEmail) { setError("Bitte E-Mail-Adresse eingeben."); return; }
    resetMutation.mutate({ email: resetEmail.trim().toLowerCase() });
  };

  // ── Styles ─────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 15,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
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

  const btnStyle = (pending: boolean): React.CSSProperties => ({
    width: "100%",
    padding: 14,
    background: pending ? "#6b9e64" : "#4a8c3f",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: pending ? "not-allowed" : "pointer",
    transition: "background 0.2s, transform 0.1s",
    marginTop: 4,
  });

  return (
    <div
      className="lw-login-page"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(150deg, #4a8c3f, #2a9d8f)",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "36px 28px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 12px 40px rgba(0,0,0,.15)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 8 }}>🌿</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#4a8c3f", margin: 0 }}>
            Lebenswert Betreuung
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {view === "login" ? "Mitarbeiter-Portal" : view === "mfa" ? "Sicherheitsprüfung" : "Passwort zurücksetzen"}
          </p>
        </div>

        {/* ── LOGIN ── */}
        {view === "login" && (
          <>
            {error && (
              <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                autoComplete="username"
                inputMode="email"
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Passwort</label>
              <input
                type="password"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Passwort vergessen Link */}
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <button
                onClick={() => { setError(""); setResetEmail(email); setView("reset-request"); }}
                style={{ background: "none", border: "none", color: "#4a8c3f", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                Passwort vergessen?
              </button>
            </div>

            <button
              onClick={doLogin}
              disabled={loginMutation.isPending}
              style={btnStyle(loginMutation.isPending)}
              onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)")}
              onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
            >
              {loginMutation.isPending ? "Anmelden…" : "Anmelden"}
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#6b7280", marginTop: 16 }}>
              🔒 SSL-verschlüsselt · DSGVO-konform
            </p>

          </>
        )}

        {/* ── ZWEI-FAKTOR-PRÜFUNG ── */}
        {view === "mfa" && (
          <>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, marginBottom: 18 }}>
              Öffnen Sie Ihre Authenticator-App und geben Sie den aktuellen sechsstelligen Sicherheitscode ein.
            </p>
            {error && <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Sicherheitscode</label>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && doLogin()} placeholder="123456" style={{ ...inputStyle, textAlign: "center", letterSpacing: 8, fontSize: 22, fontWeight: 800 }} autoFocus />
            </div>
            <button onClick={doLogin} disabled={otp.length !== 6 || loginMutation.isPending} style={btnStyle(loginMutation.isPending || otp.length !== 6)}>{loginMutation.isPending ? "Prüfe…" : "Sicher anmelden"}</button>
            <button onClick={() => { setOtp(""); setPasswort(""); setError(""); setView("login"); }} style={{ width: "100%", marginTop: 12, background: "transparent", border: 0, color: "#6b7280", cursor: "pointer" }}>Zurück</button>
          </>
        )}

        {/* ── RESET ANFORDERN ── */}
        {view === "reset-request" && (
          <>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 20, lineHeight: 1.5 }}>
              Gib deine E-Mail-Adresse ein. Du erhältst dann einen Link zum Zurücksetzen deines Passworts.
            </p>

            {error && (
              <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>E-Mail-Adresse</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="ihre@email.de"
                autoComplete="email"
                inputMode="email"
                onKeyDown={(e) => e.key === "Enter" && doRequestReset()}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <button
              onClick={doRequestReset}
              disabled={resetMutation.isPending}
              style={btnStyle(resetMutation.isPending)}
            >
              {resetMutation.isPending ? "Wird gesendet…" : "Reset-Link anfordern"}
            </button>

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                onClick={() => { setError(""); setView("login"); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
              >
                ← Zurück zum Login
              </button>
            </div>
          </>
        )}

        {/* ── RESET LINK GESENDET ── */}
        {view === "reset-sent" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>📧</span>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "#166534", fontWeight: 600, margin: "0 0 6px 0" }}>
                ✅ Reset-Link erstellt
              </p>
              <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.5 }}>
                {resetResult?.name
                  ? `Für ${resetResult.name} wurde ein Reset-Link generiert.`
                  : "Falls die E-Mail registriert ist, wurde ein Reset-Link erstellt."}
              </p>
            </div>

            {/* Reset-Link anzeigen (Demo – in Produktion per E-Mail) */}
            {resetResult?.token && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 8px 0", textTransform: "uppercase" }}>
                  🔑 Reset-Link (Demo-Modus)
                </p>
                <p style={{ fontSize: 11, color: "#78350f", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                  In der Produktion wird dieser Link per E-Mail versendet. Für Demo-Zwecke hier direkt:
                </p>
                <a
                  href={`/reset-passwort?token=${resetResult.token}`}
                  style={{
                    display: "block",
                    background: "#4a8c3f",
                    color: "#fff",
                    textAlign: "center",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  → Passwort jetzt zurücksetzen
                </a>
              </div>
            )}

            <button
              onClick={() => { setView("login"); setResetResult(null); }}
              style={{ ...btnStyle(false), background: "#6b7280" }}
            >
              Zurück zum Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
