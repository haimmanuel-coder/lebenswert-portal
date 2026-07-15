import { trpc } from "@/lib/trpc";

type BackupProtokoll = {
  id: number;
  typ: string;
  status: string;
  dateiGroesse?: number | null;
  dauer?: number | null;
  fehlerMeldung?: string | null;
  createdAt: string | Date;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; icon: string }> = {
    erfolg: { color: "#166534", bg: "#f0fdf4", icon: "✅" },
    fehler: { color: "#dc2626", bg: "#fee2e2", icon: "❌" },
    laufend: { color: "#b45309", bg: "#fffbeb", icon: "⏳" },
    uebersprungen: { color: "#6b7280", bg: "#f3f4f6", icon: "⏭️" },
  };
  const s = map[status] ?? map["uebersprungen"];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
    }}>
      {s.icon} {status}
    </span>
  );
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupStatus() {
  const { data: backups = [], isLoading, refetch } = (trpc as any).analysen.listBackups.useQuery();

  const letzterErfolg = (backups as BackupProtokoll[]).find(b => b.status === "erfolg");
  const letzterFehler = (backups as BackupProtokoll[]).find(b => b.status === "fehler");
  const gesamtAnzahl = (backups as BackupProtokoll[]).length;
  const erfolge = (backups as BackupProtokoll[]).filter(b => b.status === "erfolg").length;
  const fehler = (backups as BackupProtokoll[]).filter(b => b.status === "fehler").length;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: 0 }}>💾 Backup-Status</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Übersicht der Datensicherungen und deren Status
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔄 Aktualisieren
        </button>
      </div>

      {/* Statistik-Kacheln */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #6b7280" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>{gesamtAnzahl}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Gesamt</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #4a8c3f" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4a8c3f" }}>{erfolge}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Erfolgreich</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #dc2626" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>{fehler}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Fehler</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #7c3aed" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>
            {gesamtAnzahl > 0 ? Math.round((erfolge / gesamtAnzahl) * 100) : 0}%
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Erfolgsrate</div>
        </div>
      </div>

      {/* Letzter Erfolg / Letzter Fehler */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: letzterErfolg ? "#f0fdf4" : "#f9fafb", border: `1.5px solid ${letzterErfolg ? "#4a8c3f" : "#e5e7eb"}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>LETZTES ERFOLGREICHES BACKUP</div>
          {letzterErfolg ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                {new Date(letzterErfolg.createdAt).toLocaleString("de-DE")}
              </div>
              <div style={{ fontSize: 11, color: "#4a8c3f", marginTop: 2 }}>
                {letzterErfolg.typ} · {formatBytes(letzterErfolg.dateiGroesse)}
                {letzterErfolg.dauer ? ` · ${letzterErfolg.dauer}s` : ""}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Kein Backup vorhanden</div>
          )}
        </div>
        <div style={{ background: letzterFehler ? "#fff7ed" : "#f9fafb", border: `1.5px solid ${letzterFehler ? "#f59e0b" : "#e5e7eb"}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>LETZTER FEHLER</div>
          {letzterFehler ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>
                {new Date(letzterFehler.createdAt).toLocaleString("de-DE")}
              </div>
              <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
                {letzterFehler.fehlerMeldung ?? "Unbekannter Fehler"}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Kein Fehler vorhanden ✅</div>
          )}
        </div>
      </div>

      {/* Protokoll-Tabelle */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>📋 Backup-Protokoll</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>(letzte 30 Einträge)</span>
        </div>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>⏳ Wird geladen...</div>
        ) : (backups as BackupProtokoll[]).length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💾</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Noch keine Backups protokolliert</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Backups werden automatisch protokolliert, sobald sie ausgeführt werden.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Zeitpunkt", "Typ", "Status", "Größe", "Dauer", "Meldung"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "left", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(backups as BackupProtokoll[]).map((b, i) => (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#374151" }}>
                      {new Date(b.createdAt).toLocaleString("de-DE")}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#374151" }}>{b.typ}</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={b.status} /></td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#374151" }}>{formatBytes(b.dateiGroesse)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#374151" }}>{b.dauer ? `${b.dauer}s` : "–"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: b.fehlerMeldung ? "#dc2626" : "#9ca3af", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.fehlerMeldung ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hinweis */}
      <div style={{ marginTop: 20, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "12px 16px" }}>
        <div style={{ fontSize: 12, color: "#0369a1", lineHeight: 1.6 }}>
          <strong>ℹ️ Hinweis:</strong> Backups werden automatisch durch das System erstellt. Die Protokolle zeigen den Status der letzten Sicherungen. Bei Fehlern bitte den Systemadministrator kontaktieren.
        </div>
      </div>
    </div>
  );
}
