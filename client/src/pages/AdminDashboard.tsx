import { useState } from "react";
import { trpc } from "@/lib/trpc";

type AmpelStatus = "gruen" | "gelb" | "rot" | "grau";

function AmpelDot({ status }: { status: AmpelStatus }) {
  const cls = {
    gruen: "lw-dot lw-dot-green",
    gelb: "lw-dot lw-dot-yellow",
    rot: "lw-dot lw-dot-red",
    grau: "lw-dot",
  }[status];
  return <span className={cls} style={status === "grau" ? { background: "#d1d5db" } : undefined} />;
}

function AmpelBadge({ status, label }: { status: AmpelStatus; label: string }) {
  const cfg = {
    gruen: { cls: "lw-badge lw-badge-green", text: "OK" },
    gelb: { cls: "lw-badge lw-badge-yellow", text: "Warnung" },
    rot: { cls: "lw-badge lw-badge-red", text: "Kritisch" },
    grau: { cls: "lw-badge lw-badge-gray", text: "Kein Budget" },
  }[status];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 72 }}>
      <AmpelDot status={status} />
      <span style={{ fontSize: "0.6875rem", color: "var(--lw-gray-500)", fontWeight: 600 }}>{label}</span>
      <span className={cfg.cls} style={{ fontSize: "0.625rem", padding: "1px 6px" }}>{cfg.text}</span>
    </div>
  );
}

function BudgetProgressBar({ verbraucht, budget, ampel }: { verbraucht: number; budget: number; ampel: AmpelStatus }) {
  const pct = budget > 0 ? Math.min(100, (verbraucht / budget) * 100) : 0;
  const barCls = ampel === "rot" ? "lw-progress-bar lw-progress-bar-red"
    : ampel === "gelb" ? "lw-progress-bar lw-progress-bar-yellow"
    : "lw-progress-bar lw-progress-bar-green";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.75rem", color: "var(--lw-gray-500)" }}>
          {verbraucht.toFixed(0)} € / {budget.toFixed(0)} €
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ampel === "rot" ? "var(--lw-red)" : ampel === "gelb" ? "var(--lw-yellow)" : "var(--lw-green-600)" }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="lw-progress">
        <div className={barCls} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ icon, value, label, color, sublabel }: { icon: string; value: string | number; label: string; color: string; sublabel?: string }) {
  return (
    <div className="lw-kpi">
      <div className="lw-kpi-icon" style={{ background: color + "20" }}>
        <span style={{ fontSize: "1.25rem" }}>{icon}</span>
      </div>
      <div className="lw-kpi-value" style={{ color }}>{value}</div>
      <div className="lw-kpi-label">{label}</div>
      {sublabel && <div style={{ fontSize: "0.75rem", color: "var(--lw-gray-400)" }}>{sublabel}</div>}
    </div>
  );
}

function AuslastungsBar({ name, art, ist, soll, pct }: { name: string; art: string; ist: number; soll: number; pct: number }) {
  const ampel = pct >= 90 ? "rot" : pct >= 70 ? "gelb" : "gruen";
  const barCls = ampel === "rot" ? "lw-progress-bar lw-progress-bar-red"
    : ampel === "gelb" ? "lw-progress-bar lw-progress-bar-yellow"
    : "lw-progress-bar lw-progress-bar-green";
  const artLabel = art === "minijob" ? "Minijob" : art === "teilzeit" ? "Teilzeit" : "Vollzeit";
  const artColor = art === "minijob" ? "#8b5cf6" : art === "teilzeit" ? "#0ea5e9" : "#10b981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0", borderBottom: "1px solid var(--lw-gray-100)" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: artColor + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "1rem" }}>👤</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--lw-gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: "0.75rem", color: artColor, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{artLabel}</span>
        </div>
        <div className="lw-progress">
          <div className={barCls} style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: "0.6875rem", color: "var(--lw-gray-400)" }}>{ist}h / {soll}h</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: ampel === "rot" ? "var(--lw-red)" : ampel === "gelb" ? "#92400e" : "var(--lw-green-700)" }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [budgetFilter, setBudgetFilter] = useState<"alle" | "rot" | "gelb" | "gruen">("alle");
  const { data, isLoading } = trpc.admin.dashboardStats.useQuery();

  if (isLoading) {
    return (
      <div className="lw-page">
        <div className="lw-page-header">
          <div>
            <div className="lw-page-title">Admin-Dashboard</div>
            <div className="lw-page-subtitle">Lade Daten…</div>
          </div>
        </div>
        <div className="lw-grid-4" style={{ marginBottom: "1.25rem" }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="lw-kpi">
              <div className="lw-skeleton" style={{ width: 40, height: 40, borderRadius: "var(--lw-r-md)" }} />
              <div className="lw-skeleton" style={{ width: "60%", height: 28, marginTop: 8 }} />
              <div className="lw-skeleton" style={{ width: "80%", height: 14, marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const budgetAmpel = data?.budgetAmpel ?? [];
  const auslastung = data?.auslastung ?? [];

  const filteredBudget = budgetFilter === "alle"
    ? budgetAmpel
    : budgetAmpel.filter(k =>
        k.p45b.ampel === budgetFilter || k.p45a.ampel === budgetFilter || k.p39.ampel === budgetFilter
      );

  const rotCount = budgetAmpel.filter(k => k.p45b.ampel === "rot" || k.p45a.ampel === "rot" || k.p39.ampel === "rot").length;
  const gelbCount = budgetAmpel.filter(k => (k.p45b.ampel === "gelb" || k.p45a.ampel === "gelb" || k.p39.ampel === "gelb") && k.p45b.ampel !== "rot" && k.p45a.ampel !== "rot" && k.p39.ampel !== "rot").length;
  const gruenCount = budgetAmpel.filter(k => k.p45b.ampel === "gruen" && k.p45a.ampel !== "rot" && k.p39.ampel !== "rot").length;

  const heute = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="lw-page">
      {/* Header */}
      <div className="lw-page-header">
        <div>
          <div className="lw-page-title">Admin-Dashboard</div>
          <div className="lw-page-subtitle">{heute}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {kpis?.rotKunden ? (
            <span className="lw-badge lw-badge-red">⚠ {kpis.rotKunden} Budget-Alarm{kpis.rotKunden !== 1 ? "e" : ""}</span>
          ) : (
            <span className="lw-badge lw-badge-green">✓ Alle Budgets im grünen Bereich</span>
          )}
        </div>
      </div>

      {/* KPI-Kacheln */}
      <div className="lw-grid-3" style={{ marginBottom: "1.5rem" }}>
        <KpiCard icon="👥" value={kpis?.aktiveKunden ?? "–"} label="Aktive Kunden" color="var(--lw-green-600)" />
        <KpiCard icon="🧑‍💼" value={kpis?.aktiveMitarbeiter ?? "–"} label="Aktive Mitarbeiter" color="#0ea5e9" />
        <KpiCard icon="📅" value={kpis?.heuteEinsaetze ?? "–"} label="Einsätze heute" color="#8b5cf6" />
        <KpiCard icon="🏖️" value={kpis?.offeneUrlaube ?? "–"} label="Offene Urlaubsanträge" color="#f59e0b" sublabel="Warten auf Genehmigung" />
        <KpiCard icon="🤒" value={kpis?.aktivKrank ?? "–"} label="Aktive Krankmeldungen" color="var(--lw-red)" sublabel="Aktuell krank gemeldet" />
        <KpiCard icon="🚨" value={kpis?.rotKunden ?? "–"} label="Budget-Alarme" color="var(--lw-red)" sublabel="≥ 90% verbraucht" />
      </div>

      {/* Ampel-Legende */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--lw-gray-900)" }}>
              📊 Pflegebudget-Ampel (SGB XI)
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--lw-gray-500)", marginTop: 2 }}>
              §45b · §45a · §39 – Verbrauch nach Paragraph
            </div>
          </div>
          {/* Ampel-Filter */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { key: "alle", label: `Alle (${budgetAmpel.length})`, cls: "lw-btn lw-btn-sm lw-btn-secondary" },
              { key: "rot", label: `🔴 Kritisch (${rotCount})`, cls: "lw-btn lw-btn-sm" },
              { key: "gelb", label: `🟡 Warnung (${gelbCount})`, cls: "lw-btn lw-btn-sm" },
              { key: "gruen", label: `🟢 OK (${gruenCount})`, cls: "lw-btn lw-btn-sm" },
            ].map(f => (
              <button
                key={f.key}
                className={f.cls}
                onClick={() => setBudgetFilter(f.key as typeof budgetFilter)}
                style={{
                  background: budgetFilter === f.key
                    ? f.key === "rot" ? "var(--lw-red)" : f.key === "gelb" ? "var(--lw-yellow)" : f.key === "gruen" ? "var(--lw-green-600)" : "var(--lw-gray-800)"
                    : undefined,
                  color: budgetFilter === f.key && f.key !== "alle" ? "#fff" : undefined,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ampel-Legende */}
        <div style={{ padding: "0.75rem 1.25rem", background: "var(--lw-gray-50)", borderBottom: "1px solid var(--lw-gray-100)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {[
            { status: "gruen" as AmpelStatus, text: "< 70% verbraucht – alles gut" },
            { status: "gelb" as AmpelStatus, text: "70–89% verbraucht – Warnung" },
            { status: "rot" as AmpelStatus, text: "≥ 90% verbraucht – kritisch" },
            { status: "grau" as AmpelStatus, text: "Kein Budget hinterlegt" },
          ].map(l => (
            <div key={l.status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", color: "var(--lw-gray-600)" }}>
              <AmpelDot status={l.status} />
              {l.text}
            </div>
          ))}
        </div>

        {/* Kunden-Tabelle */}
        {filteredBudget.length === 0 ? (
          <div className="lw-empty">
            <div className="lw-empty-icon">✅</div>
            <div className="lw-empty-text">Keine Kunden in dieser Kategorie</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="lw-table">
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th>§ 45b (Entlastungsleistungen)</th>
                  <th>§ 45a (Niedrigschwellig)</th>
                  <th>§ 39 (Verhinderungspflege)</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudget.map(k => (
                  <tr key={k.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--lw-gray-900)" }}>{k.name}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <AmpelDot status={k.p45b.ampel as AmpelStatus} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <BudgetProgressBar verbraucht={k.p45b.verbraucht} budget={k.p45b.budget} ampel={k.p45b.ampel as AmpelStatus} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <AmpelDot status={k.p45a.ampel as AmpelStatus} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <BudgetProgressBar verbraucht={k.p45a.verbraucht} budget={k.p45a.budget} ampel={k.p45a.ampel as AmpelStatus} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <AmpelDot status={k.p39.ampel as AmpelStatus} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <BudgetProgressBar verbraucht={k.p39.verbraucht} budget={k.p39.budget} ampel={k.p39.ampel as AmpelStatus} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auslastung */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-header">
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--lw-gray-900)" }}>
            ⏱ Mitarbeiter-Auslastung (aktueller Monat)
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--lw-gray-500)", marginTop: 2 }}>
            Minijob: 40h Soll · Teilzeit: 80h Soll · Vollzeit: 160h Soll
          </div>
        </div>
        <div className="lw-card-body">
          {auslastung.length === 0 ? (
            <div className="lw-empty">
              <div className="lw-empty-icon">👤</div>
              <div className="lw-empty-text">Keine Mitarbeiterdaten verfügbar</div>
            </div>
          ) : (
            <div>
              {auslastung.map(m => (
                <AuslastungsBar
                  key={m.id}
                  name={m.name}
                  art={m.art}
                  ist={m.istStunden}
                  soll={m.sollStunden}
                  pct={m.auslastungProzent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schnellzugriff */}
      <div className="lw-card">
        <div className="lw-card-header">
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>⚡ Schnellzugriff</div>
        </div>
        <div className="lw-card-body">
          <div className="lw-grid-3">
            {[
              { icon: "🏖️", label: "Urlaubsanträge prüfen", badge: kpis?.offeneUrlaube, color: "#f59e0b" },
              { icon: "🤒", label: "Krankmeldungen", badge: kpis?.aktivKrank, color: "var(--lw-red)" },
              { icon: "📋", label: "Leistungsnachweise freigeben", color: "#8b5cf6" },
              { icon: "👥", label: "Mitarbeiter verwalten", color: "#0ea5e9" },
              { icon: "📤", label: "DATEV / Lexware Export", color: "#10b981" },
              { icon: "📜", label: "Audit-Logbuch", color: "var(--lw-gray-600)" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", background: "var(--lw-gray-50)", borderRadius: "var(--lw-r-md)", cursor: "pointer", border: "1px solid var(--lw-gray-200)", transition: "all 0.15s var(--ease-out)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--lw-gray-100)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--lw-gray-50)")}
              >
                <div style={{ width: 36, height: 36, borderRadius: "var(--lw-r-sm)", background: item.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--lw-gray-800)" }}>{item.label}</div>
                </div>
                {item.badge ? (
                  <span className="lw-badge lw-badge-red">{item.badge}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
