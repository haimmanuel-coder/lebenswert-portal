import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type ArchivRow = {
  id: number;
  datum: string;
  paragraph: string;
  status: string;
  dauerStunden: number | null;
  hatUnterschriftMA: number;
  hatUnterschriftKunde: number;
  unterschriftErsatzTyp: string | null;
  unterschriftFreigabeStatus: string | null;
  kundeVorname: string | null;
  kundeNachname: string | null;
  maVorname: string | null;
  maNachname: string | null;
};

function ampel(hatMA: number, hatKunde: number, ersatzTyp: string | null, freigabe: string | null) {
  if (hatMA && hatKunde) return { color: "#16a34a", bg: "#dcfce7", label: "✅ Vollständig" };
  if (hatMA && ersatzTyp && ersatzTyp !== "keine") {
    if (freigabe === "freigegeben") return { color: "#16a34a", bg: "#dcfce7", label: "✅ Ersatz freigegeben" };
    return { color: "#d97706", bg: "#fef3c7", label: "⚠️ Ersatz ausstehend" };
  }
  if (!hatMA && !hatKunde) return { color: "#dc2626", bg: "#fee2e2", label: "🔴 Keine Unterschriften" };
  if (!hatMA) return { color: "#dc2626", bg: "#fee2e2", label: "🔴 MA fehlt" };
  return { color: "#d97706", bg: "#fef3c7", label: "⚠️ Kunde fehlt" };
}

export function UnterschriftenArchivTab() {
  const heute = new Date();
  const [monat, setMonat] = useState(`${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`);
  const [filterMaId, setFilterMaId] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<"alle" | "vollstaendig" | "unvollstaendig">("alle");

  const { data: maList = [] } = trpc.admin.mitarbeiterList.useQuery();
  const { data: rows = [], isLoading, refetch } = (trpc.einsaetze as any).unterschriftenArchiv.useQuery(
    { monat, mitarbeiterId: filterMaId },
    { refetchOnWindowFocus: false }
  );

  const archivRows = rows as ArchivRow[];

  const gefiltert = useMemo(() => {
    if (filterStatus === "alle") return archivRows;
    return archivRows.filter((r) => {
      const vollst = r.hatUnterschriftMA && (r.hatUnterschriftKunde || (r.unterschriftErsatzTyp && r.unterschriftErsatzTyp !== "keine" && r.unterschriftFreigabeStatus === "freigegeben"));
      return filterStatus === "vollstaendig" ? vollst : !vollst;
    });
  }, [archivRows, filterStatus]);

  const stats = useMemo(() => {
    const gesamt = archivRows.length;
    const vollst = archivRows.filter((r) => r.hatUnterschriftMA && (r.hatUnterschriftKunde || (r.unterschriftErsatzTyp && r.unterschriftErsatzTyp !== "keine"))).length;
    const ohneMA = archivRows.filter((r) => !r.hatUnterschriftMA).length;
    const ohneKunde = archivRows.filter((r) => !r.hatUnterschriftKunde && (!r.unterschriftErsatzTyp || r.unterschriftErsatzTyp === "keine")).length;
    return { gesamt, vollst, ohneMA, ohneKunde };
  }, [archivRows]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e3a2f", margin: 0 }}>📋 Unterschriften-Archiv</h2>
        <button
          onClick={() => refetch()}
          style={{ padding: "6px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          🔄 Aktualisieren
        </button>
      </div>

      {/* KPI-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Gesamt", value: stats.gesamt, color: "#4a8c3f", bg: "#f0fdf4" },
          { label: "✅ Vollständig", value: stats.vollst, color: "#16a34a", bg: "#dcfce7" },
          { label: "🔴 MA fehlt", value: stats.ohneMA, color: "#dc2626", bg: "#fee2e2" },
          { label: "⚠️ Kunde fehlt", value: stats.ohneKunde, color: "#d97706", bg: "#fef3c7" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: kpi.bg, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 3 }}>MONAT</label>
          <input
            type="month"
            value={monat}
            onChange={(e) => setMonat(e.target.value)}
            style={{ padding: "7px 10px", border: "1.5px solid #d1fae5", borderRadius: 8, fontSize: 13, background: "#fff" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 3 }}>MITARBEITER</label>
          <select
            value={filterMaId ?? ""}
            onChange={(e) => setFilterMaId(e.target.value ? Number(e.target.value) : undefined)}
            style={{ padding: "7px 10px", border: "1.5px solid #d1fae5", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 160 }}
          >
            <option value="">Alle Mitarbeiter</option>
            {(maList as any[]).map((ma: any) => (
              <option key={ma.id} value={ma.id}>{ma.vorname} {ma.nachname}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 3 }}>STATUS</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{ padding: "7px 10px", border: "1.5px solid #d1fae5", borderRadius: 8, fontSize: 13, background: "#fff" }}
          >
            <option value="alle">Alle</option>
            <option value="vollstaendig">✅ Vollständig</option>
            <option value="unvollstaendig">⚠️ Unvollständig</option>
          </select>
        </div>
      </div>

      {/* Tabelle */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>⏳ Lade Archiv...</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 600 }}>Keine Einträge für diesen Filter</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f0fdf4" }}>
                {["Datum", "Mitarbeiter", "Kunde", "§", "Stunden", "Status"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#4a8c3f", fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #d1fae5" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((r, i) => {
                const a = ampel(r.hatUnterschriftMA, r.hatUnterschriftKunde, r.unterschriftErsatzTyp, r.unterschriftFreigabeStatus);
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f0fdf4" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.datum ? new Date(r.datum).toLocaleDateString("de-DE") : "–"}</td>
                    <td style={{ padding: "8px 10px" }}>{r.maVorname} {r.maNachname}</td>
                    <td style={{ padding: "8px 10px" }}>{r.kundeVorname} {r.kundeNachname}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>§{r.paragraph}</span>
                    </td>
                    <td style={{ padding: "8px 10px" }}>{r.dauerStunden ? `${r.dauerStunden}h` : "–"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ background: a.bg, color: a.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {a.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
            {gefiltert.length} von {archivRows.length} Einträgen angezeigt
          </div>
        </div>
      )}
    </div>
  );
}
