import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

export default function Datenschutz() {
  const { mitarbeiter } = usePortalAuth() as any;
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [tab, setTab] = useState<"meine" | "alle" | "vorlagen">(isAdmin ? "alle" : "meine");

  const { data: meineZustimmungen = [], refetch: refetchMeine } = (trpc.datenschutz as any).getMeineZustimmungen.useQuery(
    undefined,
    { enabled: tab === "meine" }
  );
  const { data: alleZustimmungen = [], refetch: refetchAlle } = (trpc.datenschutz as any).getAlleZustimmungen.useQuery(
    undefined,
    { enabled: tab === "alle" && isAdmin }
  );
  const { data: vorlagen = [], refetch: refetchVorlagen } = (trpc.datenschutz as any).listVorlagen.useQuery(
    undefined,
    { enabled: tab === "vorlagen" && isAdmin }
  );

  const zustimmen = (trpc.datenschutz as any).zustimmen.useMutation({
    onSuccess: () => { toast.success("✅ Zustimmung gespeichert!"); refetchMeine(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const [neueVorlage, setNeueVorlage] = useState({ titel: "", inhalt: "", version: "1.0", pflicht: true });
  const createVorlage = (trpc.datenschutz as any).createVorlage.useMutation({
    onSuccess: () => { toast.success("✅ Vorlage erstellt!"); refetchVorlagen(); setNeueVorlage({ titel: "", inhalt: "", version: "1.0", pflicht: true }); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>🔐 Datenschutz & Einwilligungen</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>DSGVO-konforme Zustimmungsverwaltung für alle Mitarbeiter</p>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        {[
          { id: "meine", label: "📋 Meine Einwilligungen" },
          ...(isAdmin ? [
            { id: "alle", label: "👥 Alle Mitarbeiter" },
            { id: "vorlagen", label: "📝 Vorlagen verwalten" },
          ] : []),
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

      {/* Meine Einwilligungen */}
      {tab === "meine" && (
        <div style={{ display: "grid", gap: 12 }}>
          {(meineZustimmungen as any[]).length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700 }}>Keine ausstehenden Einwilligungen</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Alle Datenschutzerklärungen wurden bereits bestätigt.</div>
            </div>
          ) : (
            (meineZustimmungen as any[]).map((z: any) => (
              <div key={z.id} style={{ background: "#fff", borderRadius: 16, border: `2px solid ${z.zugestimmt ? "#86efac" : "#fcd34d"}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{z.vorlage?.titel ?? "Datenschutzerklärung"}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Version {z.vorlage?.version ?? "1.0"}</div>
                  </div>
                  <span style={{
                    background: z.zugestimmt ? "#f0fdf4" : "#fef9c3",
                    color: z.zugestimmt ? "#166534" : "#92400e",
                    border: `1px solid ${z.zugestimmt ? "#86efac" : "#fcd34d"}`,
                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                  }}>
                    {z.zugestimmt ? "✅ Zugestimmt" : "⏳ Ausstehend"}
                  </span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  {z.vorlage?.inhalt && (
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 14, maxHeight: 120, overflow: "auto", background: "#f9fafb", borderRadius: 8, padding: "10px 12px" }}>
                      {z.vorlage.inhalt}
                    </div>
                  )}
                  {!z.zugestimmt && (
                    <button
                      onClick={() => zustimmen.mutate({ vorlageId: z.vorlageId })}
                      disabled={zustimmen.isPending}
                      style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}
                    >
                      {zustimmen.isPending ? "Wird gespeichert..." : "✅ Ich stimme zu"}
                    </button>
                  )}
                  {z.zugestimmt && z.zugestimmtAm && (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      Zugestimmt am {new Date(z.zugestimmtAm).toLocaleDateString("de-DE")} um {new Date(z.zugestimmtAm).toLocaleTimeString("de-DE")}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alle Mitarbeiter (Admin) */}
      {tab === "alle" && isAdmin && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
            Einwilligungs-Übersicht aller Mitarbeiter
          </div>
          {(alleZustimmungen as any[]).length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>Keine Einträge vorhanden.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Mitarbeiter", "Vorlage", "Version", "Status", "Datum"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(alleZustimmungen as any[]).map((z: any, i: number) => (
                    <tr key={z.mitarbeiterId ?? i} style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {z.name ?? `${z.mitarbeiter?.vorname ?? ""} ${z.mitarbeiter?.nachname ?? ""}`}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>
                        {z.zustimmungen ? z.zustimmungen.map((s: any) => s.titel).join(", ") : (z.vorlage?.titel ?? "—")}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>v{z.vorlage?.version ?? "1.0"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: z.zugestimmt ? "#f0fdf4" : "#fef9c3",
                          color: z.zugestimmt ? "#166534" : "#92400e",
                          border: `1px solid ${z.zugestimmt ? "#86efac" : "#fcd34d"}`,
                          borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        }}>
                          {z.zugestimmt ? "✅ Ja" : "⏳ Ausstehend"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>
                        {z.zugestimmtAm ? new Date(z.zugestimmtAm).toLocaleDateString("de-DE") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vorlagen verwalten (Admin) */}
      {tab === "vorlagen" && isAdmin && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Neue Vorlage erstellen */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
              ➕ Neue Datenschutz-Vorlage
            </div>
            <div style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Titel</label>
                  <input
                    value={neueVorlage.titel}
                    onChange={e => setNeueVorlage(v => ({ ...v, titel: e.target.value }))}
                    placeholder="z.B. Datenschutzerklärung 2025"
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Version</label>
                  <input
                    value={neueVorlage.version}
                    onChange={e => setNeueVorlage(v => ({ ...v, version: e.target.value }))}
                    style={{ width: 80, padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Pflicht</label>
                  <div style={{ display: "flex", alignItems: "center", height: 42 }}>
                    <input
                      type="checkbox"
                      checked={neueVorlage.pflicht}
                      onChange={e => setNeueVorlage(v => ({ ...v, pflicht: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Inhalt</label>
                <textarea
                  value={neueVorlage.inhalt}
                  onChange={e => setNeueVorlage(v => ({ ...v, inhalt: e.target.value }))}
                  placeholder="Vollständiger Datenschutztext..."
                  rows={6}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <button
                onClick={() => createVorlage.mutate(neueVorlage)}
                disabled={createVorlage.isPending || !neueVorlage.titel || !neueVorlage.inhalt}
                style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {createVorlage.isPending ? "Wird erstellt..." : "💾 Vorlage speichern"}
              </button>
            </div>
          </div>

          {/* Vorlagen-Liste */}
          {(vorlagen as any[]).map((v: any) => (
            <div key={v.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.titel}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Version {v.version} · {v.pflicht ? "🔴 Pflichtfeld" : "🟡 Optional"}</div>
                </div>
                <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  Aktiv
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.5, maxHeight: 80, overflow: "hidden" }}>
                {v.inhalt}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
