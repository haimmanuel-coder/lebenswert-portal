import { useState } from "react";
import { trpc } from "@/lib/trpc";

const TABS = [
  { id: "uebersicht", label: "📊 Übersicht", icon: "📊" },
  { id: "personal", label: "👥 Personal", icon: "👥" },
  { id: "kunden", label: "👴 Kunden", icon: "👴" },
  { id: "finanzen", label: "💰 Finanzen", icon: "💰" },
  { id: "prognose", label: "📈 Prognose", icon: "📈" },
];

function KennzahlKarte({ label, wert, einheit = "", farbe = "#4a8c3f", icon = "📌" }: {
  label: string; wert: string | number; einheit?: string; farbe?: string; icon?: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 18px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderLeft: `4px solid ${farbe}`,
    }}>
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

export default function AnalyseDashboard() {
  const [activeTab, setActiveTab] = useState("uebersicht");

  const { data: dashData, isLoading } = (trpc as any).pflichtenheft.analyse.dashboard.useQuery();
  const { data: snapshots = [] } = (trpc as any).analysen.list.useQuery({});

  const k = dashData?.kennzahlen ?? {};
  const trend = dashData?.trend ?? {};

  const exportCSV = () => {
    const rows = [
      ["Kennzahl", "Wert"],
      ["Kunden", k.kunden ?? 0],
      ["Mitarbeiter", k.mitarbeiter ?? 0],
      ["Geplante Einsätze", k.geplanteEinsaetze ?? 0],
      ["Abgeschlossene Einsätze", k.abgeschlosseneEinsaetze ?? 0],
      ["Absagen", k.absagen ?? 0],
      ["Auslastung %", k.auslastungProzent ?? 0],
      ["Budget €", k.budget ?? 0],
      ["Verbrauch €", k.verbrauch ?? 0],
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysen_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
        <div>Daten werden geladen...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: 0 }}>📊 Analyse-Dashboard</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Auswertungen und Kennzahlen für Lebensnah Betreuung
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          📥 CSV-Export
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f3f4f6", borderRadius: 12, padding: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
              background: activeTab === tab.id ? "#fff" : "transparent",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              color: activeTab === tab.id ? "#1f2937" : "#6b7280",
              fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Übersicht */}
      {activeTab === "uebersicht" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            <KennzahlKarte label="Aktive Kunden" wert={k.kunden ?? 0} icon="👴" farbe="#4a8c3f" />
            <KennzahlKarte label="Mitarbeiter" wert={k.mitarbeiter ?? 0} icon="👥" farbe="#7c3aed" />
            <KennzahlKarte label="Kunden/Mitarbeiter" wert={k.kundenProMitarbeiter ?? 0} icon="📊" farbe="#b45309" />
            <KennzahlKarte label="Geplante Einsätze" wert={k.geplanteEinsaetze ?? 0} icon="📅" farbe="#0891b2" />
            <KennzahlKarte label="Abgeschlossene Einsätze" wert={k.abgeschlosseneEinsaetze ?? 0} icon="✅" farbe="#4a8c3f" />
            <KennzahlKarte label="Absagen" wert={k.absagen ?? 0} icon="❌" farbe="#dc2626" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <AmpelBadge wert={k.auslastungProzent ?? 0} schwelle1={70} schwelle2={90} label="Auslastung" />
            {k.berichteOffen > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", background: "#fffbeb", padding: "3px 10px", borderRadius: 20, border: "1px solid #f59e0b" }}>
                ⚠️ {k.berichteOffen} offene Besuchsberichte
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab: Personal */}
      {activeTab === "personal" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
            <KennzahlKarte label="Mitarbeiter gesamt" wert={k.mitarbeiter ?? 0} icon="👥" farbe="#7c3aed" />
            <KennzahlKarte label="Auslastung" wert={`${k.auslastungProzent ?? 0}`} einheit="%" icon="⚡" farbe={k.auslastungProzent > 85 ? "#dc2626" : "#4a8c3f"} />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Auslastungs-Ampel</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 12, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 6,
                  width: `${Math.min(k.auslastungProzent ?? 0, 100)}%`,
                  background: (k.auslastungProzent ?? 0) > 85 ? "#dc2626" : (k.auslastungProzent ?? 0) > 70 ? "#f59e0b" : "#4a8c3f",
                  transition: "width 0.5s",
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#374151", minWidth: 40 }}>{k.auslastungProzent ?? 0}%</span>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              🟢 &lt;70% optimal · 🟡 70–85% erhöht · 🔴 &gt;85% kritisch
            </div>
          </div>
        </div>
      )}

      {/* Tab: Kunden */}
      {activeTab === "kunden" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            <KennzahlKarte label="Aktive Kunden" wert={k.kunden ?? 0} icon="👴" farbe="#4a8c3f" />
            <KennzahlKarte label="Kunden/Mitarbeiter" wert={k.kundenProMitarbeiter ?? 0} icon="📊" farbe="#b45309" />
            <KennzahlKarte label="Absagen" wert={k.absagen ?? 0} icon="❌" farbe="#dc2626" />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>Trend (letzte 3 Monate)</h3>
            {(trend as any[]).length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>Noch keine Trenddaten vorhanden</div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                {(trend as any[]).map((t: any, i: number) => (
                  <div key={i} style={{ flex: 1, background: "#f9fafb", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{t.monat}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#4a8c3f" }}>{t.kunden}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>Kunden</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Finanzen */}
      {activeTab === "finanzen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
            <KennzahlKarte label="Gesamtbudget" wert={`${(k.budget ?? 0).toLocaleString("de-DE")}`} einheit="€" icon="💰" farbe="#4a8c3f" />
            <KennzahlKarte label="Verbrauch" wert={`${(k.verbrauch ?? 0).toLocaleString("de-DE")}`} einheit="€" icon="📉" farbe="#b45309" />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Budget-Auslastung</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 16, background: "#f3f4f6", borderRadius: 8, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 8,
                  width: `${k.budget > 0 ? Math.min(Math.round((k.verbrauch / k.budget) * 100), 100) : 0}%`,
                  background: "#4a8c3f", transition: "width 0.5s",
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#374151", minWidth: 50 }}>
                {k.budget > 0 ? Math.round((k.verbrauch / k.budget) * 100) : 0}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
              <span>0 €</span>
              <span>{(k.budget ?? 0).toLocaleString("de-DE")} €</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Prognose */}
      {activeTab === "prognose" && (
        <div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>📈 Gespeicherte Prognosen</h3>
            {(snapshots as any[]).length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", padding: "20px 0" }}>
                Noch keine Prognosen erstellt. Prognosen werden über das Arbeitszentrum (Pflichtenheft) erstellt.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(snapshots as any[]).slice(0, 10).map((s: any) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", minWidth: 70 }}>{s.monat}</span>
                    <span style={{ fontSize: 11, color: "#374151", flex: 1 }}>{s.typ}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#4a8c3f" }}>
                      {Number(s.prognoseWert).toLocaleString("de-DE")}
                    </span>
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
