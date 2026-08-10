import { trpc } from "@/lib/trpc";

const STATUS_COLOR: Record<string, string> = {
  success: "#4a8c3f", ok: "#4a8c3f", aktiv: "#4a8c3f",
  error: "#dc2626", fehler: "#dc2626",
  running: "#2563eb", laufend: "#2563eb",
  warning: "#d97706",
};

function KpiCard({ label, value, sub, color = "#374151" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.07)", padding: "16px 20px", minWidth: 140 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function SystemstatusTab() {
  const { data, isLoading, refetch } = (trpc as any).systemStatus.get.useQuery(undefined, { refetchInterval: 30_000 });

  if (isLoading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>⏳ Lade Systemstatus...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40, color: "#dc2626" }}>❌ Systemstatus nicht verfügbar</div>;

  const d = data as any;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🖥️ Systemstatus</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Zuletzt aktualisiert: {new Date(d.serverZeit).toLocaleString("de-DE")} · Node {d.nodeVersion}</div>
        </div>
        <button onClick={() => refetch()}
          style={{ padding: "6px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
          🔄 Aktualisieren
        </button>
      </div>

      {/* KPI-Karten */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Server-Uptime" value={d.uptime} sub="seit letztem Neustart" color="#2563eb" />
        <KpiCard label="DB-Tabellen" value={d.tabellenAnzahl} sub="in der Datenbank" color="#4a8c3f" />
        <KpiCard label="Aktive Mitarbeiter" value={d.mitarbeiterAktiv} color="#4a8c3f" />
        <KpiCard label="Aktive Kunden" value={d.kundenAktiv} color="#4a8c3f" />
        <KpiCard label="Einsätze gesamt" value={d.einsaetzeGesamt} color="#374151" />
        <KpiCard label="Leistungsnachweise" value={d.leistungsnachweise} color="#374151" />
        <KpiCard label="Ungelesene Notifs" value={d.ungeleseneNotifs} color={d.ungeleseneNotifs > 0 ? "#d97706" : "#4a8c3f"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Letzte Backup-Läufe */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.07)", padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💾 Letzte Backup-Läufe</div>
          {d.backups.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Noch keine Backup-Läufe vorhanden</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280" }}>Typ</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280" }}>Datum</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "#6b7280" }}>Größe</th>
                </tr>
              </thead>
              <tbody>
                {d.backups.map((b: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td style={{ padding: "6px 8px" }}>{b.typ ?? "–"}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: STATUS_COLOR[b.status] ? STATUS_COLOR[b.status] + "22" : "#f3f4f6",
                        color: STATUS_COLOR[b.status] ?? "#374151" }}>
                        {b.status ?? "–"}
                      </span>
                    </td>
                    <td style={{ padding: "6px 8px", color: "#6b7280" }}>
                      {b.startedAt ? new Date(b.startedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–"}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>
                      {b.dateiGroesse ? `${Math.round(b.dateiGroesse / 1024)} KB` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Letzte Audit-Einträge */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.07)", padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Letzte Aktivitäten</div>
          {d.recentAudit.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Noch keine Aktivitäten protokolliert</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {d.recentAudit.map((a: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#f9fafb", borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                      background: a.action === "DELETE" ? "#fee2e2" : a.action === "CREATE" ? "#dcfce7" : "#f3f4f6",
                      color: a.action === "DELETE" ? "#991b1b" : a.action === "CREATE" ? "#166534" : "#374151" }}>
                      {a.action}
                    </span>
                    <span style={{ fontSize: 12, color: "#374151", marginLeft: 6 }}>{a.ressource}</span>
                    {a.details && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>· {String(a.details).slice(0, 30)}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>
                    {a.createdAt ? new Date(a.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
