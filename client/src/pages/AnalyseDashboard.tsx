import { useState } from "react";
import { trpc } from "@/lib/trpc";

const TABS = [
  { id: "uebersicht", label: "📊 Übersicht" },
  { id: "personal", label: "👥 Personal" },
  { id: "kunden", label: "👴 Kunden" },
  { id: "finanzen", label: "💰 Finanzen" },
  { id: "prognose", label: "📈 Prognose" },
];

function KennzahlKarte({ label, wert, einheit = "", farbe = "#4a8c3f", icon = "📌" }: {
  label: string; wert: string | number; einheit?: string; farbe?: string; icon?: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderLeft: `4px solid ${farbe}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: farbe }}>
        {wert}<span style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginLeft: 4 }}>{einheit}</span>
      </div>
    </div>
  );
}

function AmpelBadge({ wert, schwelle1, schwelle2, label }: { wert: number; schwelle1: number; schwelle2: number; label: string }) {
  const color = wert >= schwelle2 ? "#dc2626" : wert >= schwelle1 ? "#f59e0b" : "#4a8c3f";
  const emoji = wert >= schwelle2 ? "🔴" : wert >= schwelle1 ? "🟡" : "🟢";
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color, background: `${color}18`, padding: "3px 10px", borderRadius: 20 }}>
      {emoji} {label}: {wert}%
    </span>
  );
}

function SkeletonKarte() {
  return (
    <div style={{ background: "#f3f4f6", borderRadius: 12, padding: "16px 18px", height: 72, animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

export default function AnalyseDashboard() {
  const [activeTab, setActiveTab] = useState("uebersicht");

  // Neue Analyse-Procedures
  const { data: dashData, isLoading: dashLoading } = (trpc as any).analysen.getDashboard.useQuery();
  const { data: auslastung = [], isLoading: auslastungLoading } = (trpc as any).analysen.mitarbeiterAuslastung.useQuery(
    undefined, { enabled: activeTab === "personal" }
  );
  const { data: kundenzuwachs = [], isLoading: kundenzuwachsLoading } = (trpc as any).analysen.kundenzuwachs.useQuery(
    { monate: 6 }, { enabled: activeTab === "kunden" }
  );
  const { data: pflegegrad = [], isLoading: pflegegradLoading } = (trpc as any).analysen.pflegegradAnalyse.useQuery(
    undefined, { enabled: activeTab === "kunden" }
  );
  const { data: umsatz, isLoading: umsatzLoading } = (trpc as any).analysen.umsatzPrognose.useQuery(
    { monate: 3 }, { enabled: activeTab === "finanzen" || activeTab === "prognose" }
  );
  const { data: puenktlichkeit } = (trpc as any).analysen.puenktlichkeit.useQuery(
    undefined, { enabled: activeTab === "uebersicht" }
  );
  const { data: snapshots = [] } = (trpc as any).analysen.list.useQuery({});

  const d = dashData ?? {};

  const exportCSV = () => {
    const rows = [
      ["Kennzahl", "Wert"],
      ["Aktive Kunden", d.aktiveKunden ?? 0],
      ["Aktive Mitarbeiter", d.aktiveMitarbeiter ?? 0],
      ["Monatseinsätze", d.monatsEinsaetze ?? 0],
      ["Abgeschlossene Einsätze", d.abgeschlosseneEinsaetze ?? 0],
      ["Monatsstunden", d.monatsStunden ?? 0],
      ["Monats-km", d.monatsKm ?? 0],
      ["Umsatzprognose €", d.umsatzPrognose ?? 0],
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analysen_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: 0 }}>📊 Analyse-Dashboard</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Auswertungen und Kennzahlen für Lebenswert Betreuung</p>
        </div>
        <button onClick={exportCSV} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          📥 CSV-Export
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f3f4f6", borderRadius: 12, padding: 4, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
            background: activeTab === tab.id ? "#fff" : "transparent",
            boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            color: activeTab === tab.id ? "#1f2937" : "#6b7280",
            fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Übersicht */}
      {activeTab === "uebersicht" && (
        <div>
          {dashLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[...Array(6)].map((_, i) => <SkeletonKarte key={i} />)}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                <KennzahlKarte label="Aktive Kunden" wert={d.aktiveKunden ?? 0} icon="👴" farbe="#4a8c3f" />
                <KennzahlKarte label="Mitarbeiter" wert={d.aktiveMitarbeiter ?? 0} icon="👥" farbe="#7c3aed" />
                <KennzahlKarte label="Monatseinsätze" wert={d.monatsEinsaetze ?? 0} icon="📅" farbe="#0891b2" />
                <KennzahlKarte label="Abgeschlossen" wert={d.abgeschlosseneEinsaetze ?? 0} icon="✅" farbe="#4a8c3f" />
                <KennzahlKarte label="Monatsstunden" wert={d.monatsStunden ?? 0} einheit="h" icon="⏱️" farbe="#b45309" />
                <KennzahlKarte label="Umsatzprognose" wert={(d.umsatzPrognose ?? 0).toLocaleString("de-DE")} einheit="€" icon="💶" farbe="#059669" />
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {puenktlichkeit && <AmpelBadge wert={100 - (puenktlichkeit.quote ?? 100)} schwelle1={10} schwelle2={25} label="Ausfallquote" />}
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0891b2", background: "#e0f2fe", padding: "3px 10px", borderRadius: 20 }}>
                  🚗 {d.monatsKm ?? 0} km diesen Monat
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Personal */}
      {activeTab === "personal" && (
        <div>
          {auslastungLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(4)].map((_, i) => <SkeletonKarte key={i} />)}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Mitarbeiter-Auslastung (aktueller Monat)</h3>
              {(auslastung as any[]).length === 0 ? (
                <div style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>Keine Daten vorhanden</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(auslastung as any[]).map((ma: any) => (
                    <div key={ma.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ minWidth: 130, fontSize: 13, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ma.name}</div>
                      <div style={{ flex: 1, height: 10, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 5, width: `${ma.auslastungProzent}%`, background: ma.ampel === "gruen" ? "#4a8c3f" : ma.ampel === "gelb" ? "#f59e0b" : "#dc2626", transition: "width 0.5s" }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 50, textAlign: "right", color: ma.ampel === "gruen" ? "#4a8c3f" : ma.ampel === "gelb" ? "#f59e0b" : "#dc2626" }}>
                        {ma.auslastungProzent}%
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 70 }}>{ma.istStunden}h / {ma.sollStunden}h</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af" }}>🟢 &lt;60% · 🟡 60–89% · 🔴 ≥90%</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Kunden */}
      {activeTab === "kunden" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Pflegegrad-Verteilung */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Pflegegrad-Verteilung</h3>
            {pflegegradLoading ? <SkeletonKarte /> : (
              <div style={{ display: "flex", gap: 8 }}>
                {(pflegegrad as any[]).map((pg: any) => (
                  <div key={pg.pflegegrad} style={{ flex: 1, background: "#f9fafb", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>PG {pg.pflegegrad}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#4a8c3f" }}>{pg.aktiv}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>aktiv</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Kundenzuwachs */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Kundenzuwachs (letzte 6 Monate)</h3>
            {kundenzuwachsLoading ? <SkeletonKarte /> : (
              <div style={{ display: "flex", gap: 8 }}>
                {(kundenzuwachs as any[]).map((m: any) => (
                  <div key={m.monat} style={{ flex: 1, background: "#f9fafb", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>{m.monat.slice(5)}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#4a8c3f" }}>{m.aktiv}</div>
                    {m.neu > 0 && <div style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>+{m.neu} neu</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Finanzen */}
      {activeTab === "finanzen" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {umsatzLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[...Array(4)].map((_, i) => <SkeletonKarte key={i} />)}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <KennzahlKarte label="Umsatzprognose (3 Monate)" wert={((umsatz as any)?.gesamt ?? 0).toLocaleString("de-DE")} einheit="€" icon="💶" farbe="#059669" />
                <KennzahlKarte label="Monatsstunden" wert={d.monatsStunden ?? 0} einheit="h" icon="⏱️" farbe="#b45309" />
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Monatliche Umsatzentwicklung</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {((umsatz as any)?.prognose ?? []).map((m: any) => (
                    <div key={m.monat} style={{ flex: 1, background: "#f9fafb", borderRadius: 8, padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>{m.monat.slice(5)}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#059669" }}>{m.umsatz.toLocaleString("de-DE")} €</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{m.abgeschlossen} Einsätze</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af" }}>* Berechnung: Stunden × 28,50 € Stundensatz</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Prognose */}
      {activeTab === "prognose" && (
        <div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>📈 Gespeicherte Prognosen</h3>
            {(snapshots as any[]).length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", padding: "20px 0" }}>
                Noch keine Prognosen erstellt. Prognosen werden über das Arbeitszentrum erstellt.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(snapshots as any[]).slice(0, 10).map((s: any) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", minWidth: 70 }}>{s.monat}</span>
                    <span style={{ fontSize: 11, color: "#374151", flex: 1 }}>{s.typ}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#4a8c3f" }}>{Number(s.prognoseWert).toLocaleString("de-DE")}</span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{s.vertrauenProzent}% Konfidenz</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
