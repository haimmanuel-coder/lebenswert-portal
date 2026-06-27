import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { setStoredToken } from "@/contexts/PortalAuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [error, setError] = useState("");
  const { refetch } = usePortalAuth();

  const loginMutation = trpc.portal.login.useMutation({
    onSuccess: async (data) => {
      // Store token in localStorage so Authorization header is sent on all requests
      if (data.token) {
        setStoredToken(data.token);
      }
      // Small delay then refetch – token is now in localStorage
      await new Promise((r) => setTimeout(r, 100));
      await refetch();
    },
    onError: (e) => {
      setError(e.message || "E-Mail oder Passwort ungültig.");
    },
  });

  const doLogin = () => {
    setError("");
    if (!email || !passwort) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    loginMutation.mutate({ email: email.trim().toLowerCase(), passwort });
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
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 52, display: "block", marginBottom: 10 }}>🌿</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#4a8c3f", margin: 0 }}>
            Lebenswert Betreuung
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Mitarbeiter-Portal</p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* E-Mail */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ihre@email.de"
            autoComplete="username"
            inputMode="email"
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "2px solid #e5e7eb",
              borderRadius: 10,
              fontSize: 15,
              outline: "none",
              transition: "border-color 0.2s",
              background: "#fff",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Passwort */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            Passwort
          </label>
          <input
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "2px solid #e5e7eb",
              borderRadius: 10,
              fontSize: 15,
              outline: "none",
              transition: "border-color 0.2s",
              background: "#fff",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4a8c3f")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Login Button */}
        <button
          onClick={doLogin}
          disabled={loginMutation.isPending}
          style={{
            width: "100%",
            padding: 14,
            background: loginMutation.isPending ? "#6b9e64" : "#4a8c3f",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: loginMutation.isPending ? "not-allowed" : "pointer",
            transition: "background 0.2s, transform 0.1s",
            marginTop: 4,
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)")}
          onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          {loginMutation.isPending ? "Anmelden…" : "Anmelden"}
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: "#6b7280", marginTop: 16 }}>
          🔒 SSL-verschlüsselt · DSGVO-konform
        </p>

        <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
          Demo: anna.mueller@lebenswert.de · Passwort: password
        </p>
      </div>
    </div>
  );
}
