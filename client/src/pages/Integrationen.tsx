import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

const INTEGRATION_TYPEN = [
  { id: "optadata", name: "OptaData", icon: "💼", beschreibung: "Abrechnungssoftware für Pflegedienste", farbe: "#3b82f6" },
  { id: "datev", name: "DATEV", icon: "📊", beschreibung: "Buchhaltung und Lohnabrechnung", farbe: "#10b981" },
  { id: "email", name: "E-Mail SMTP", icon: "📧", beschreibung: "Automatische E-Mail-Benachrichtigungen", farbe: "#f59e0b" },
  { id: "sms", name: "SMS-Gateway", icon: "📱", beschreibung: "SMS-Benachrichtigungen an Kunden", farbe: "#8b5cf6" },
  { id: "kalender", name: "Kalender-Sync", icon: "📅", beschreibung: "Google Calendar / Outlook-Synchronisation", farbe: "#ef4444" },
  { id: "lexware", name: "Lexware", icon: "📒", beschreibung: "Lohnbuchhaltung und Finanzbuchhaltung (Lexware)", farbe: "#0ea5e9" },
  { id: "kasse", name: "Kassenanbindung", icon: "🏦", beschreibung: "DTA/API-Direktabrechnung mit Kostenträgern", farbe: "#d97706" },
];

export default function Integrationen() {
  const { mitarbeiter } = usePortalAuth() as any;
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [tab, setTab] = useState<"integrationen" | "analysen">("integrationen");

  const { data: integrationen = [], refetch: refetchInt } = (trpc.integrationen as any).list.useQuery(
    undefined,
    { enabled: tab === "integrationen" && isAdmin }
  );
  const { data: analysen } = (trpc.analysen as any).getDashboard.useQuery(
    undefined,
    { enabled: tab === "analysen" && isAdmin }
  );

  const [editIntegration, setEditIntegration] = useState<any>(null);
  const [editForm, setEditForm] = useState({ apiKey: "", apiUrl: "", aktiv: true, einstellungen: "" });

  const saveIntegration = (trpc.integrationen as any).save.useMutation({
    onSuccess: () => { toast.success("✅ Integration gespeichert!"); refetchInt(); setEditIntegration(null); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const testIntegration = (trpc.integrationen as any).test.useMutation({
    onSuccess: (data: any) => toast.success(data.message ?? "✅ Verbindung erfolgreich!"),
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  if (!isAdmin) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#374151" }}>Kein Zugriff</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Dieser Bereich ist nur für Administratoren zugänglich.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>⚙️ Integrationen & Analysen</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Externe Dienste verbinden und Auswertungen einsehen</p>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        {[
          { id: "integrationen", label: "🔌 Integrationen" },
          { id: "analysen", label: "📈 Analysen & KPIs" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0d9488" : "#6b7280",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Integrationen */}
      {tab === "integrationen" && (
        <div style={{ display: "grid", gap: 12 }}>
          {INTEGRATION_TYPEN.map(typ => {
            const vorhandene = (integrationen as any[]).find((i: any) => i.typ === typ.id);
            return (
              <div key={typ.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, background: `${typ.farbe}15`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                    }}>
                      {typ.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{typ.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{typ.beschreibung}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      background: vorhandene?.aktiv ? "#f0fdf4" : "#f3f4f6",
                      color: vorhandene?.aktiv ? "#166534" : "#6b7280",
                      border: `1px solid ${vorhandene?.aktiv ? "#86efac" : "#d1d5db"}`,
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    }}>
                      {vorhandene?.aktiv ? "✅ Aktiv" : "⭕ Nicht konfiguriert"}
                    </span>
                    <button
                      onClick={() => {
                        setEditIntegration(typ);
                        setEditForm({
                          apiKey: vorhandene?.apiKey ?? "",
                          apiUrl: vorhandene?.apiUrl ?? "",
                          aktiv: vorhandene?.aktiv ?? true,
                          einstellungen: vorhandene?.einstellungen ? JSON.stringify(vorhandene.einstellungen, null, 2) : "",
                        });
                      }}
                      style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      ⚙️ Konfigurieren
                    </button>
                    {vorhandene?.aktiv && (
                      <button
                        onClick={() => testIntegration.mutate({ typ: typ.id })}
                        disabled={testIntegration.isPending}
                        style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #93c5fd", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        🔗 Testen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analysen-Dashboard */}
      {tab === "analysen" && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* KPI-Karten */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Aktive Kunden", wert: analysen?.aktivKunden ?? "—", icon: "👥", farbe: "#3b82f6" },
              { label: "Einsätze diese Woche", wert: analysen?.einsaetzeDieseWoche ?? "—", icon: "📅", farbe: "#10b981" },
              { label: "Ø Einsatzdauer (h)", wert: analysen?.durchschnittlicheEinsatzdauer ? `${analysen.durchschnittlicheEinsatzdauer}h` : "—", icon: "⏱️", farbe: "#f59e0b" },
              { label: "Offene Budgets", wert: analysen?.offeneBudgets ?? "—", icon: "💰", farbe: "#ef4444" },
              { label: "Mitarbeiter aktiv", wert: analysen?.aktiveMitarbeiter ?? "—", icon: "👤", farbe: "#8b5cf6" },
              { label: "Einsätze geplant", wert: analysen?.tourenGeplant ?? "—", icon: "🗓️", farbe: "#0d9488" },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "20px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${kpi.farbe}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {kpi.icon}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{kpi.label}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: kpi.farbe }}>{kpi.wert}</div>
              </div>
            ))}
          </div>

          {/* Monatliche Übersicht */}
          {analysen?.monatlicheEinsaetze && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "20px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 16 }}>📊 Einsätze der letzten 6 Monate</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {(analysen.monatlicheEinsaetze as any[]).map((m: any, i: number) => {
                  const max = Math.max(...(analysen.monatlicheEinsaetze as any[]).map((x: any) => x.anzahl), 1);
                  const hoehe = Math.max((m.anzahl / max) * 100, 4);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488" }}>{m.anzahl}</div>
                      <div style={{
                        width: "100%", height: `${hoehe}%`, background: "linear-gradient(180deg, #0d9488, #14b8a6)",
                        borderRadius: "6px 6px 0 0", minHeight: 4,
                      }} />
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{m.monat}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top-Mitarbeiter */}
          {analysen?.topMitarbeiter && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
                🏆 Top-Mitarbeiter nach Einsätzen
              </div>
              {(analysen.topMitarbeiter as any[]).map((m: any, i: number) => (
                <div key={i} style={{ padding: "12px 18px", borderTop: i > 0 ? "1px solid #f3f4f6" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: i === 0 ? "#fef9c3" : i === 1 ? "#f3f4f6" : "#fff7ed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800, color: i === 0 ? "#92400e" : "#6b7280",
                    }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{m.name}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0d9488" }}>{m.anzahl} Einsätze</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Integration-Konfiguration Modal */}
      {editIntegration && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px", maxWidth: 480, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>
                {editIntegration.icon} {editIntegration.name} konfigurieren
              </h2>
              <button onClick={() => setEditIntegration(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>API-Schlüssel</label>
                <input
                  type="password"
                  value={editForm.apiKey}
                  onChange={e => setEditForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>API-URL (optional)</label>
                <input
                  type="url"
                  value={editForm.apiUrl}
                  onChange={e => setEditForm(f => ({ ...f, apiUrl: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editForm.aktiv}
                  onChange={e => setEditForm(f => ({ ...f, aktiv: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Integration aktivieren</span>
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setEditIntegration(null)}
                  style={{ flex: 1, background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => saveIntegration.mutate({ typ: editIntegration.id, ...editForm })}
                  disabled={saveIntegration.isPending}
                  style={{ flex: 2, background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  {saveIntegration.isPending ? "Wird gespeichert..." : "💾 Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
