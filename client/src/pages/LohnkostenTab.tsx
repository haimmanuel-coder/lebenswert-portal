import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BESCHAEFT_COLOR: Record<string, string> = {
  minijob: "#7e22ce",
  teilzeit: "#1d4ed8",
  vollzeit: "#4a8c3f",
};

const BESCHAEFT_LABEL: Record<string, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};

function fmtEuro(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function exportCSV(monat: string, positionen: Array<{ vorname: string; nachname: string; beschaeftigungsart: string; geleisteteStunden: number; monatslohn: number; stundenlohn: number; lohnkosten: number }>, summe: number) {
  const header = ["Monat", "Vorname", "Nachname", "Beschäftigungsart", "Std. geleistet", "Monatslohn (€)", "Stundenlohn (€)", "Lohnkosten (€)"];
  const rows = positionen.map((p) => [
    monat,
    p.vorname,
    p.nachname,
    p.beschaeftigungsart,
    String(p.geleisteteStunden).replace(".", ","),
    String(p.monatslohn).replace(".", ","),
    String(p.stundenlohn).replace(".", ","),
    String(p.lohnkosten).replace(".", ","),
  ]);
  rows.push(["", "", "", "GESAMT", "", "", "", String(summe).replace(".", ",")]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM für Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lohnkosten_${monat}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LohnkostenTab() {
  const today = new Date().toISOString().slice(0, 7);
  const [monat, setMonat] = useState(today);

  const { data, isLoading } = trpc.compliance.lohnkostenMonat.useQuery({ monat });

  const positionen = data?.positionen ?? [];
  const summe = data?.summe ?? 0;

  // Nur MA mit Lohnkosten > 0 im Diagramm anzeigen
  const chartDaten = positionen
    .filter((p) => p.lohnkosten > 0)
    .map((p) => ({
      name: `${p.vorname} ${p.nachname}`.length > 14 ? p.vorname : `${p.vorname} ${p.nachname}`,
      lohnkosten: p.lohnkosten,
      beschaeftigungsart: p.beschaeftigungsart,
    }));

  return (
    <div>
      {/* Header + Monat-Picker */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>💰 Lohnkosten-Übersicht</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Monatliche Personalkosten aller aktiven Mitarbeiter</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="month"
            value={monat}
            onChange={(e) => setMonat(e.target.value)}
            style={{ padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff" }}
          />
          <button
            onClick={() => exportCSV(monat, positionen, summe)}
            disabled={positionen.length === 0}
            style={{ padding: "8px 14px", background: positionen.length > 0 ? "#4a8c3f" : "#d1d5db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: positionen.length > 0 ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      {/* Summen-KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#4a8c3f" }}>{fmtEuro(summe)}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Gesamtlohnkosten</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{monat}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1d4ed8" }}>{positionen.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Mitarbeiter</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>aktiv</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#d97706" }}>
            {positionen.length > 0 ? fmtEuro(summe / positionen.length) : "–"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Ø pro Mitarbeiter</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Durchschnitt</div>
        </div>
      </div>

      {/* Balkendiagramm */}
      {chartDaten.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Lohnkosten nach Mitarbeiter</div>
          <ResponsiveContainer width="100%" height={Math.max(160, chartDaten.length * 36)}>
            <BarChart data={chartDaten} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => [fmtEuro(v), "Lohnkosten"]} />
              <Bar dataKey="lohnkosten" radius={[0, 4, 4, 0]}>
                {chartDaten.map((entry, i) => (
                  <Cell key={i} fill={BESCHAEFT_COLOR[entry.beschaeftigungsart] ?? "#4a8c3f"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legende */}
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {Object.entries(BESCHAEFT_COLOR).map(([key, color]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                <span style={{ color: "#374151", fontWeight: 600 }}>{BESCHAEFT_LABEL[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Detailübersicht</div>
        {isLoading ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>Lade Daten…</div>
        ) : positionen.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>Keine Mitarbeiter gefunden.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>Mitarbeiter</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>Art</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>Std. geleistet</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>Monatslohn</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>Stundenlohn</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>Lohnkosten</th>
                </tr>
              </thead>
              <tbody>
                {positionen.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>
                      {p.vorname} {p.nachname}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: p.beschaeftigungsart === "vollzeit" ? "#e8f5e4" : p.beschaeftigungsart === "teilzeit" ? "#dbeafe" : "#f3e8ff",
                        color: BESCHAEFT_COLOR[p.beschaeftigungsart] ?? "#374151",
                      }}>
                        {BESCHAEFT_LABEL[p.beschaeftigungsart] ?? p.beschaeftigungsart}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #f3f4f6", color: "#374151" }}>
                      {p.geleisteteStunden} h
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #f3f4f6", color: "#374151" }}>
                      {p.monatslohn > 0 ? fmtEuro(p.monatslohn) : "–"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #f3f4f6", color: "#374151" }}>
                      {p.stundenlohn > 0 ? fmtEuro(p.stundenlohn) : "–"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #f3f4f6", fontWeight: 700, color: p.lohnkosten > 0 ? "#4a8c3f" : "#9ca3af" }}>
                      {p.lohnkosten > 0 ? fmtEuro(p.lohnkosten) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f0fdf4" }}>
                  <td colSpan={5} style={{ padding: "10px 10px", fontWeight: 800, fontSize: 14, color: "#374151" }}>
                    Gesamt
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 900, fontSize: 15, color: "#4a8c3f" }}>
                    {fmtEuro(summe)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Hinweis */}
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef9c3", borderRadius: 10, fontSize: 12, color: "#92400e" }}>
        <strong>Hinweis:</strong> Lohnkosten werden berechnet aus: Monatslohn (wenn hinterlegt) oder geleistete Stunden × Stundenlohn. Mitarbeiter ohne hinterlegten Lohn werden mit 0 € ausgewiesen.
      </div>
    </div>
  );
}
