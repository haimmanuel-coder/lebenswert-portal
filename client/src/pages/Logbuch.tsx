import { useState } from "react";
import { trpc } from "@/lib/trpc";

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  LOGIN:                   { label: "Anmeldung",         icon: "🔐", color: "lw-badge-green" },
  LOGOUT:                  { label: "Abmeldung",         icon: "🚪", color: "lw-badge-gray" },
  CREATE:                  { label: "Erstellt",          icon: "✅", color: "lw-badge-blue" },
  UPDATE:                  { label: "Geändert",          icon: "✏️", color: "lw-badge-yellow" },
  DELETE:                  { label: "Gelöscht",          icon: "🗑️", color: "lw-badge-red" },
  PASSWORD_RESET_REQUEST:  { label: "PW-Reset",          icon: "🔑", color: "lw-badge-orange" },
  EXPORT:                  { label: "Export",            icon: "📤", color: "lw-badge-blue" },
};

function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "–";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Logbuch() {
  const { data: me } = trpc.portal.me.useQuery();
  const isAdmin = me?.rolle === "admin";

  const [filter, setFilter] = useState({ action: "", ressource: "", search: "" });
  const { data: logs = [], isLoading } = trpc.admin.auditLogs.useQuery(
    { limit: 200 },
    { enabled: isAdmin }
  );

  if (!isAdmin) {
    return (
      <div className="lw-page">
        <div className="lw-card">
          <div className="lw-empty">
            <div className="lw-empty-icon">🔒</div>
            <div className="lw-empty-text">Kein Zugriff</div>
            <div className="lw-empty-sub">Das Logbuch ist nur für Administratoren sichtbar.</div>
          </div>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = (logs as any[]).filter((l: any) => {
    if (filter.action && l.action !== filter.action) return false;
    if (filter.ressource && l.ressource !== filter.ressource) return false;
    if (filter.search) {
      const s = filter.search.toLowerCase();
      if (!(l.details ?? "").toLowerCase().includes(s) && !(l.ressource ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueActions = Array.from(new Set((logs as any[]).map((l: any) => l.action)));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueRessourcen = Array.from(new Set((logs as any[]).map((l: any) => l.ressource)));

  return (
    <div className="lw-page">
      <div className="lw-page-header">
        <div>
          <div className="lw-page-title">Logbuch</div>
          <div className="lw-page-subtitle">Alle Systemaktivitäten im Überblick</div>
        </div>
        <div className="lw-badge lw-badge-gray" style={{ fontSize: "0.875rem", padding: "0.4rem 0.75rem" }}>
          {filtered.length} Einträge
        </div>
      </div>

      {/* Filter */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-body">
          <div className="lw-grid-3">
            <div>
              <label className="lw-label">Aktion</label>
              <select className="lw-input" value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}>
                <option value="">Alle Aktionen</option>
                {uniqueActions.map((a: unknown) => (
                  <option key={String(a)} value={String(a)}>{ACTION_LABELS[String(a)]?.label ?? String(a)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lw-label">Bereich</label>
              <select className="lw-input" value={filter.ressource} onChange={e => setFilter(f => ({ ...f, ressource: e.target.value }))}>
                <option value="">Alle Bereiche</option>
                {uniqueRessourcen.map((r: unknown) => (
                  <option key={String(r)} value={String(r)}>{String(r)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lw-label">Suche</label>
              <input className="lw-input" placeholder="Details durchsuchen…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Log-Tabelle */}
      <div className="lw-card">
        {isLoading ? (
          <div className="lw-empty"><div className="lw-empty-icon">⏳</div><div className="lw-empty-text">Lade Logbuch…</div></div>
        ) : filtered.length === 0 ? (
          <div className="lw-empty"><div className="lw-empty-icon">📋</div><div className="lw-empty-text">Keine Einträge gefunden</div></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="lw-table">
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Mitarbeiter-ID</th>
                  <th>Aktion</th>
                  <th>Bereich</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {filtered.map((l: any) => {
                  const actionInfo = ACTION_LABELS[l.action] ?? { label: l.action, icon: "📌", color: "lw-badge-gray" };
                  return (
                    <tr key={l.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.8125rem" }}>{fmtDateTime(l.createdAt)}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--lw-gray-500)" }}>#{l.mitarbeiterId}</td>
                      <td>
                        <span className={`lw-badge ${actionInfo.color}`}>
                          {actionInfo.icon} {actionInfo.label}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>{l.ressource ?? "–"}</td>
                      <td style={{ fontSize: "0.8125rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.details ?? "–"}
                      </td>
                      <td>
                        <span className={`lw-badge ${l.status === "success" ? "lw-badge-green" : "lw-badge-red"}`}>
                          {l.status === "success" ? "✓" : "✗"} {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
