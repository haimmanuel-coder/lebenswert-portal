import { useState } from "react";
import { trpc } from "@/lib/trpc";

const AKTION_FARBEN: Record<string, { bg: string; color: string }> = {
  CREATE:  { bg: "#dcfce7", color: "#166534" },
  UPDATE:  { bg: "#dbeafe", color: "#1e40af" },
  DELETE:  { bg: "#fee2e2", color: "#991b1b" },
  READ:    { bg: "#f3f4f6", color: "#374151" },
  ADMIN:   { bg: "#fef3c7", color: "#92400e" },
  LOGIN:   { bg: "#e0f2fe", color: "#0369a1" },
  LOGOUT:  { bg: "#f1f5f9", color: "#475569" },
};

export default function AuditLogTab() {
  const [aktionFilter, setAktionFilter] = useState("alle");
  const [ressourceFilter, setRessourceFilter] = useState("");
  const [limit, setLimit] = useState(200);

  const { data: logs = [], isLoading, refetch } = (trpc as any).admin.auditLogs.useQuery({ limit });

  const gefiltert = (logs as any[]).filter((l: any) => {
    if (aktionFilter !== "alle" && l.action !== aktionFilter) return false;
    if (ressourceFilter.trim() && !(l.ressource ?? "").toLowerCase().includes(ressourceFilter.toLowerCase())) return false;
    return true;
  });

  const aktionen = ["alle", "CREATE", "UPDATE", "DELETE", "READ", "ADMIN", "LOGIN", "LOGOUT"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Audit-Log</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{gefiltert.length} von {logs.length} Einträgen</div>
        </div>
        <button onClick={() => refetch()} style={{ padding: "7px 14px", background: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>🔄 Aktualisieren</button>
      </div>

      {/* Filter-Leiste */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {aktionen.map(a => (
            <button key={a} onClick={() => setAktionFilter(a)}
              style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: aktionFilter === a ? "#4a8c3f" : "#f3f4f6",
                color: aktionFilter === a ? "#fff" : "#4b5563" }}>
              {a}
            </button>
          ))}
        </div>
        <input
          value={ressourceFilter}
          onChange={e => setRessourceFilter(e.target.value)}
          placeholder="🔍 Ressource filtern..."
          style={{ padding: "5px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, outline: "none", minWidth: 160 }}
        />
        <select value={limit} onChange={e => setLimit(Number(e.target.value))}
          style={{ padding: "5px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}>
          <option value={100}>100 Einträge</option>
          <option value={200}>200 Einträge</option>
          <option value={500}>500 Einträge</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>⏳ Lade Audit-Log...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Keine Einträge gefunden</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Zeitstempel</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Aktion</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Ressource</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Details</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Status</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>MA-ID</th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((l: any, i: number) => {
                const farbe = AKTION_FARBEN[l.action] ?? AKTION_FARBEN.READ;
                return (
                  <tr key={l.id ?? i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "7px 10px", color: "#6b7280", whiteSpace: "nowrap" }}>
                      {l.createdAt ? new Date(l.createdAt).toLocaleString("de-DE") : "–"}
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: farbe.bg, color: farbe.color }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: "#374151" }}>{l.ressource ?? "–"}</td>
                    <td style={{ padding: "7px 10px", color: "#6b7280", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={l.details ?? ""}>
                      {l.details ?? "–"}
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: l.status === "success" ? "#dcfce7" : "#fee2e2",
                        color: l.status === "success" ? "#166534" : "#991b1b" }}>
                        {l.status ?? "–"}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px", color: "#9ca3af", fontSize: 11 }}>{l.mitarbeiterId ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
