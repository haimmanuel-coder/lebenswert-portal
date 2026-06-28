import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function downloadCSV(inhalt: string, dateiname: string) {
  const bom = "\uFEFF"; // UTF-8 BOM für Excel
  const blob = new Blob([bom + inhalt], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MassenExport() {
  const heute = new Date();
  const letzterMonat = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
  const [monat, setMonat] = useState(letzterMonat.toISOString().slice(0, 7));
  const [exportiert, setExportiert] = useState<string[]>([]);

  const { data: paket, isLoading, refetch } = trpc.export.monatspaket.useQuery({ monat }, { enabled: !!monat });

  const monatLabel = monat ? new Date(monat + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" }) : "";

  const handleDownload = (typ: "einsaetze" | "leistungen" | "fahrten") => {
    if (!paket?.csv) return;
    const namen: Record<string, string> = {
      einsaetze: `Einsaetze_${monat}.csv`,
      leistungen: `Leistungsnachweise_${monat}.csv`,
      fahrten: `Fahrtkosten_${monat}.csv`,
    };
    downloadCSV(paket.csv[typ], namen[typ]);
    setExportiert(prev => prev.includes(typ) ? prev : [...prev, typ]);
    toast.success(`${namen[typ]} heruntergeladen!`);
  };

  const handleAlleDownloaden = () => {
    if (!paket?.csv) return;
    handleDownload("einsaetze");
    setTimeout(() => handleDownload("leistungen"), 300);
    setTimeout(() => handleDownload("fahrten"), 600);
    toast.success("Alle 3 CSV-Dateien werden heruntergeladen!");
  };

  const exportCards = [
    {
      id: "einsaetze" as const,
      icon: "📅",
      titel: "Einsätze",
      beschreibung: "Alle Einsätze mit Mitarbeiter, Datum, Kunde, Paragraph, Stunden und Status",
      farbe: "#4a8c3f",
      anzahl: paket?.stats.einsaetze ?? 0,
      einheit: "Einsätze",
    },
    {
      id: "leistungen" as const,
      icon: "📋",
      titel: "Leistungsnachweise",
      beschreibung: "Alle Leistungsnachweise mit Betrag, Paragraph und Status",
      farbe: "#2a9d8f",
      anzahl: paket?.stats.leistungen ?? 0,
      einheit: "Nachweise",
    },
    {
      id: "fahrten" as const,
      icon: "🚗",
      titel: "Fahrtkosten",
      beschreibung: "Alle Fahrten mit Kilometern, Vergütung und Abrechnungsstatus",
      farbe: "#d97706",
      anzahl: paket?.stats.fahrten ?? 0,
      einheit: "Fahrten",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", margin: 0 }}>📦 Massen-Export</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Alle Daten eines Monats als CSV herunterladen</p>
      </div>

      {/* Monat wählen */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "16px", border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>
          📅 Monat auswählen
        </label>
        <input
          type="month"
          value={monat}
          onChange={e => { setMonat(e.target.value); setExportiert([]); }}
          max={heute.toISOString().slice(0, 7)}
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 16, boxSizing: "border-box" }}
        />
        {monat && <div style={{ fontSize: 12, color: "#4a8c3f", marginTop: 6, fontWeight: 600 }}>Ausgewählt: {monatLabel}</div>}
      </div>

      {/* Lade-Status */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: 30, color: "#6b7280" }}>
          <div style={{ fontSize: 30 }}>⏳</div>
          <div style={{ marginTop: 8 }}>Daten werden geladen...</div>
        </div>
      )}

      {paket && !isLoading && (
        <>
          {/* Monats-Zusammenfassung */}
          <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)", borderRadius: 14, padding: "16px", marginBottom: 16, color: "#fff" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Zusammenfassung {monatLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Einsätze", wert: paket.stats.einsaetze },
                { label: "Stunden", wert: paket.stats.stunden.toFixed(1) + "h" },
                { label: "Leistungen", wert: paket.stats.leistungen },
                { label: "Betrag", wert: paket.stats.betrag.toFixed(2) + " €" },
                { label: "Fahrten", wert: paket.stats.fahrten },
                { label: "Kilometer", wert: paket.stats.km.toFixed(1) + " km" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{s.wert}</div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alle auf einmal */}
          <button onClick={handleAlleDownloaden}
            style={{ width: "100%", padding: "14px", background: "#1f2937", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span>📦</span> Alle 3 Dateien auf einmal herunterladen
          </button>

          {/* Einzelne Downloads */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {exportCards.map(card => (
              <div key={card.id} style={{ background: "#fff", borderRadius: 14, padding: "16px", border: `1.5px solid ${exportiert.includes(card.id) ? card.farbe : "#e5e7eb"}`, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{card.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>{card.titel}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{card.beschreibung}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: card.farbe }}>{card.anzahl}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{card.einheit}</div>
                  </div>
                </div>

                {card.anzahl === 0 ? (
                  <div style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                    Keine Daten für diesen Monat
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(card.id)}
                    style={{
                      width: "100%", padding: "10px", borderRadius: 10, border: "none",
                      background: exportiert.includes(card.id) ? "#dcfce7" : card.farbe,
                      color: exportiert.includes(card.id) ? "#16a34a" : "#fff",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                    {exportiert.includes(card.id) ? "✅ Heruntergeladen" : `⬇️ ${card.titel}.csv herunterladen`}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Hinweis */}
          <div style={{ background: "#fffbeb", borderRadius: 12, padding: "12px 14px", marginTop: 16, border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>💡 Tipp: Excel-Import</div>
            <div style={{ fontSize: 12, color: "#78350f" }}>
              Die CSV-Dateien können direkt in Excel oder Google Tabellen geöffnet werden.
              Für DATEV-Import: Datei in DATEV Unternehmen online hochladen oder an deinen Steuerberater weiterleiten.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
