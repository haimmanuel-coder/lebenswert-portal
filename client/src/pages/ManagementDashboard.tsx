import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#4a8c3f", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString();
  return new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const actionLabels: Record<string, string> = {
  LOGIN: "🔐 Login",
  LOGOUT: "🚪 Logout",
  CREATE: "➕ Erstellt",
  UPDATE: "✏️ Aktualisiert",
  DELETE: "🗑️ Gelöscht",
  EXPORT: "📤 Export",
  ADMIN: "👑 Admin",
};

const statusColors: Record<string, string> = {
  success: "#4a8c3f",
  failure: "#dc2626",
  partial: "#f59e0b",
};

export default function ManagementDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const [monat, setMonat] = useState(today.slice(0, 7));
  const [auditLimit, setAuditLimit] = useState(50);

  const { data: statistik } = trpc.admin.statistik.useQuery({ monat }, { enabled: !!monat });
  const { data: auditLogs = [] } = trpc.admin.auditLogs.useQuery({ limit: auditLimit });
  const { data: maList = [] } = trpc.admin.mitarbeiterList.useQuery();
  const { data: kundenList = [] } = trpc.kunden.list.useQuery();
  const { data: einsaetze = [] } = trpc.einsaetze.list.useQuery();
  const { data: leistungen = [] } = trpc.leistungen.list.useQuery();
  const { data: fahrten = [] } = trpc.fahrten.list.useQuery();

  // Letzte 6 Monate für Trend-Chart
  const letzteMonateDaten = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("de-DE", { month: "short" });
      const monEis = einsaetze.filter((e) => {
        const ed = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
        return ed?.slice(0, 7) === m;
      });
      const monFahr = fahrten.filter((f) => {
        const fd = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
        return fd?.slice(0, 7) === m;
      });
      result.push({
        monat: label,
        einsaetze: monEis.length,
        km: Math.round(monFahr.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0)),
        stunden: parseFloat(monEis.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0).toFixed(1)),
      });
    }
    return result;
  }, [einsaetze, fahrten]);

  // Paragraph-Verteilung
  const paragraphDaten = useMemo(() => {
    const counts: Record<string, number> = { "45b": 0, "45a": 0, "39": 0 };
    einsaetze.forEach((e) => { if (e.paragraph in counts) counts[e.paragraph]++; });
    return Object.entries(counts).map(([name, value]) => ({ name: `§${name}`, value }));
  }, [einsaetze]);

  // Status-Verteilung Einsätze
  const statusDaten = useMemo(() => {
    const counts: Record<string, number> = { geplant: 0, abgeschlossen: 0, abgesagt: 0 };
    einsaetze.forEach((e) => { if (e.status in counts) counts[e.status]++; });
    return [
      { name: "Geplant", value: counts.geplant, color: "#f59e0b" },
      { name: "Abgeschlossen", value: counts.abgeschlossen, color: "#4a8c3f" },
      { name: "Abgesagt", value: counts.abgesagt, color: "#dc2626" },
    ];
  }, [einsaetze]);

  const kpiCard = (icon: string, label: string, value: string | number, sub?: string, color = "#4a8c3f") => (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: "14px 16px" }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Management-Dashboard</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Lebenswert Betreuung – Übersicht</div>
      </div>

      {/* Monat-Selektor */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Monat:</span>
        <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} style={{ padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff" }} />
      </div>

      {/* KPI-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        {kpiCard("👥", "Mitarbeiter", maList.filter((m) => m.aktiv).length, `${maList.length} gesamt`)}
        {kpiCard("🏠", "Kunden", kundenList.length, "aktive Kunden")}
        {kpiCard("📅", "Einsätze", statistik?.einsaetze ?? "–", monat, "#2a9d8f")}
        {kpiCard("⏱", "Stunden", statistik ? parseFloat(String(statistik.stunden)).toFixed(1) : "–", monat, "#e9c46a")}
        {kpiCard("🚗", "km", statistik ? parseFloat(String(statistik.km)).toFixed(0) : "–", monat, "#f4a261")}
        {kpiCard("💶", "Vergütung", statistik ? `${parseFloat(String(statistik.verguetung)).toFixed(2)} €` : "–", monat, "#4a8c3f")}
      </div>

      {/* Trend-Chart: Einsätze letzte 6 Monate */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📈 Einsätze – letzte 6 Monate</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={letzteMonateDaten} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, "Einsätze"]} />
            <Bar dataKey="einsaetze" fill="#4a8c3f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stunden-Trend */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⏱ Stunden – letzte 6 Monate</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={letzteMonateDaten} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, "Stunden"]} />
            <Line type="monotone" dataKey="stunden" stroke="#2a9d8f" strokeWidth={2} dot={{ fill: "#2a9d8f", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Paragraph-Verteilung */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>§-Verteilung</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={paragraphDaten} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" label={({ name, value }) => value > 0 ? `${name}` : ""} labelLine={false} fontSize={10}>
                {paragraphDaten.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Einsatz-Status</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={statusDaten} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" labelLine={false} fontSize={10}>
                {statusDaten.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
            {statusDaten.map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span>{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit-Log */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>🔍 Audit-Log</div>
          <select
            value={auditLimit}
            onChange={(e) => setAuditLimit(parseInt(e.target.value))}
            style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, outline: "none" }}
          >
            <option value={25}>25 Einträge</option>
            <option value={50}>50 Einträge</option>
            <option value={100}>100 Einträge</option>
            <option value={200}>200 Einträge</option>
          </select>
        </div>
        {auditLogs.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13 }}>Noch keine Log-Einträge.</p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {auditLogs.map((log) => {
              const ma = maList.find((m) => m.id === log.mitarbeiterId);
              return (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColors[log.status] || "#6b7280", marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {actionLabels[log.action] || log.action}
                      {log.ressource && <span style={{ color: "#6b7280", fontWeight: 400 }}> · {log.ressource}</span>}
                    </div>
                    {ma && <div style={{ fontSize: 11, color: "#6b7280" }}>{ma.vorname} {ma.nachname}</div>}
                    {log.details && <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.details}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, textAlign: "right" }}>
                    {fmtDate(log.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
