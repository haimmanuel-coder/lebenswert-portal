import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ZweiFaktor() {
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"status" | "setup" | "verify" | "done">("status");
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string; recoveryCodes: string[] } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [deactivateCode, setDeactivateCode] = useState("");
  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data: status, refetch: refetchStatus } = (trpc as any).twoFactor.getStatus.useQuery();
  const setupMut = (trpc as any).twoFactor.setupGenerate.useMutation({
    onSuccess: (data: any) => {
      setSetupData(data);
      setStep("setup");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const activateMut = (trpc as any).twoFactor.activate.useMutation({
    onSuccess: (data: any) => {
      setRecoveryCodes(data.recoveryCodes ?? []);
      setStep("done");
      refetchStatus();
      toast.success("2FA erfolgreich aktiviert!");
    },
    onError: (e: any) => toast.error(e.message || "Code ungültig"),
  });
  const deactivateMut = (trpc as any).twoFactor.deactivate.useMutation({
    onSuccess: () => {
      setShowDeactivate(false);
      setDeactivateCode("");
      setStep("status");
      refetchStatus();
      toast.success("2FA deaktiviert");
    },
    onError: (e: any) => toast.error(e.message || "Code ungültig"),
  });

  const isActive = (status as any)?.enabled;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: 0 }}>🔒 Zwei-Faktor-Authentifizierung</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Schütze deinen Account mit einem zusätzlichen Sicherheitscode (TOTP).
        </p>
      </div>

      {/* Status-Kachel */}
      <div style={{
        background: isActive ? "#f0fdf4" : "#fff7ed",
        border: `2px solid ${isActive ? "#4a8c3f" : "#f59e0b"}`,
        borderRadius: 14, padding: "18px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ fontSize: 32 }}>{isActive ? "✅" : "⚠️"}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: isActive ? "#166534" : "#92400e" }}>
            2FA ist {isActive ? "aktiviert" : "deaktiviert"}
          </div>
          <div style={{ fontSize: 12, color: isActive ? "#4a8c3f" : "#b45309", marginTop: 2 }}>
            {isActive
              ? "Dein Account ist durch einen zusätzlichen Code geschützt."
              : "Aktiviere 2FA für mehr Sicherheit beim Login."}
          </div>
        </div>
      </div>

      {/* Schritt 1: Status → Setup starten */}
      {step === "status" && !isActive && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>2FA einrichten</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            Du benötigst eine Authenticator-App (z.B. <strong>Google Authenticator</strong>, <strong>Authy</strong> oder <strong>Microsoft Authenticator</strong>).
            Scanne den QR-Code mit der App und gib den 6-stelligen Code ein.
          </p>
          <button
            onClick={() => setupMut.mutate({})}
            disabled={setupMut.isPending}
            style={{
              background: "#4a8c3f", color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700,
              cursor: "pointer", width: "100%",
            }}
          >
            {setupMut.isPending ? "⏳ Wird vorbereitet..." : "🔒 2FA jetzt einrichten"}
          </button>
        </div>
      )}

      {/* Schritt 2: QR-Code anzeigen */}
      {step === "setup" && setupData && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>📱 QR-Code scannen</h2>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <img src={setupData.qrCode} alt="QR-Code" style={{ width: 200, height: 200, border: "2px solid #e5e7eb", borderRadius: 12 }} />
          </div>
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: "monospace", fontSize: 13, color: "#374151", wordBreak: "break-all" }}>
            <strong>Manueller Code:</strong> {setupData.secret}
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Gib nach dem Scannen den 6-stelligen Code aus der App ein:
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{
              width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb",
              borderRadius: 10, fontSize: 20, fontWeight: 700, textAlign: "center",
              letterSpacing: 8, outline: "none", boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => activateMut.mutate({ token: code })}
            disabled={code.length !== 6 || activateMut.isPending}
            style={{
              background: code.length === 6 ? "#4a8c3f" : "#9ca3af",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 14, fontWeight: 700,
              cursor: code.length === 6 ? "pointer" : "default",
              width: "100%", marginTop: 12,
            }}
          >
            {activateMut.isPending ? "⏳ Wird aktiviert..." : "✅ Aktivieren"}
          </button>
        </div>
      )}

      {/* Schritt 3: Wiederherstellungscodes */}
      {step === "done" && recoveryCodes.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>🔑 Wiederherstellungscodes</h2>
          <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
              <strong>Wichtig:</strong> Speichere diese Codes sicher ab! Sie können verwendet werden, wenn du keinen Zugriff auf deine Authenticator-App hast. Jeder Code ist nur einmal verwendbar.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {recoveryCodes.map((c, i) => (
              <div key={i} style={{
                background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "8px 12px", fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                color: "#374151", textAlign: "center",
              }}>{c}</div>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(recoveryCodes.join("\n"));
              toast.success("Codes in Zwischenablage kopiert");
            }}
            style={{
              background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb",
              borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", width: "100%",
            }}
          >
            📋 Alle Codes kopieren
          </button>
        </div>
      )}

      {/* 2FA deaktivieren */}
      {isActive && step === "status" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>2FA deaktivieren</h2>
          {!showDeactivate ? (
            <button
              onClick={() => setShowDeactivate(true)}
              style={{
                background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5",
                borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔓 2FA deaktivieren
            </button>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                Gib deinen aktuellen 2FA-Code ein, um 2FA zu deaktivieren:
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={deactivateCode}
                onChange={(e) => setDeactivateCode(e.target.value.replace(/\D/g, ""))}
                style={{
                  width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb",
                  borderRadius: 10, fontSize: 20, fontWeight: 700, textAlign: "center",
                  letterSpacing: 8, outline: "none", boxSizing: "border-box", marginBottom: 12,
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setShowDeactivate(false); setDeactivateCode(""); }}
                  style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => deactivateMut.mutate({ token: deactivateCode })}
                  disabled={deactivateCode.length !== 6 || deactivateMut.isPending}
                  style={{
                    flex: 1, background: "#dc2626", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {deactivateMut.isPending ? "⏳..." : "Deaktivieren"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
