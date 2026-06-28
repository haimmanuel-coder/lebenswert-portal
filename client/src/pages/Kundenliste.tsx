import { useState } from "react";
import { trpc } from "@/lib/trpc";

type KundeDetail = {
  id: number;
  vorname: string;
  nachname: string;
  geburtsdatum?: string | Date | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  telefon?: string | null;
  mobil?: string | null;
  email?: string | null;
  kostentraeger?: string | null;
  versicherungsnummer?: string | null;
  pflegegrad?: number | null;
  paragraph?: string | null;
  budget45b?: string | number | null;
  verbraucht45b?: string | number | null;
  letzteAbrechnung45b?: string | null;
  budget45a?: string | number | null;
  verbraucht45a?: string | number | null;
  letzteAbrechnung45a?: string | null;
  budget39?: string | number | null;
  verbraucht39?: string | number | null;
  letzteAbrechnung39?: string | null;
  aktiv?: number;
};

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function formatEuro(v: string | number | null | undefined): string {
  return toNum(v).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function formatDate(v: string | Date | null | undefined): string {
  if (!v) return "–";
  const d = new Date(v);
  return d.toLocaleDateString("de-DE");
}

function BudgetBar({ budget, verbraucht, label }: { budget: number; verbraucht: number; label: string }) {
  if (budget <= 0 && verbraucht <= 0) return null;
  const total = Math.max(budget, verbraucht);
  const pct = total > 0 ? Math.min(100, (verbraucht / total) * 100) : 0;
  const rest = budget - verbraucht;
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#4a8c3f";

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 3 }}>
        <span>§{label} SGB XI</span>
        <span style={{ color: rest < 0 ? "#ef4444" : "#4a8c3f" }}>
          {rest >= 0 ? `${formatEuro(rest)} verfügbar` : `${formatEuro(Math.abs(rest))} überschritten`}
        </span>
      </div>
      <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
        <span>Verbraucht: {formatEuro(verbraucht)}</span>
        <span>Budget: {formatEuro(budget)}</span>
      </div>
    </div>
  );
}

function KundenKarte({ k, onClick }: { k: KundeDetail; onClick: () => void }) {
  const b45b = toNum(k.budget45b);
  const v45b = toNum(k.verbraucht45b);
  const b45a = toNum(k.budget45a);
  const v45a = toNum(k.verbraucht45a);
  const b39 = toNum(k.budget39);
  const v39 = toNum(k.verbraucht39);
  const hasBudget = b45b > 0 || v45b > 0 || b45a > 0 || v45a > 0 || b39 > 0 || v39 > 0;

  const pgColors: Record<number, string> = { 1: "#94a3b8", 2: "#60a5fa", 3: "#34d399", 4: "#f59e0b", 5: "#ef4444" };
  const pg = k.pflegegrad ?? 2;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        padding: 16,
        marginBottom: 12,
        cursor: "pointer",
        borderLeft: `4px solid ${pgColors[pg] ?? "#4a8c3f"}`,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.12)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.08)"; }}
    >
      {/* Kopfzeile */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: hasBudget ? 12 : 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${pgColors[pg]}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏠</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1f2937" }}>{k.vorname} {k.nachname}</div>
          {k.geburtsdatum && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>🎂 {formatDate(k.geburtsdatum)}</div>
          )}
          {(k.strasse || k.ort) && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📍 {[k.strasse, k.plz, k.ort].filter(Boolean).join(", ")}
            </div>
          )}
          {k.telefon && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>📞 {k.telefon}</div>}
          {k.mobil && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>📱 {k.mobil}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: `${pgColors[pg]}22`, color: pgColors[pg] }}>
            PG {pg}
          </span>
          {k.paragraph && (
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#e8f5e4", color: "#4a8c3f" }}>
              §{k.paragraph}
            </span>
          )}
        </div>
      </div>

      {/* Budget-Balken */}
      {hasBudget && (
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
          <BudgetBar budget={b45b} verbraucht={v45b} label="45b" />
          <BudgetBar budget={b45a} verbraucht={v45a} label="45a" />
          <BudgetBar budget={b39} verbraucht={v39} label="39" />
        </div>
      )}

      {/* Kostenträger */}
      {k.kostentraeger && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", borderTop: hasBudget ? "none" : "1px solid #f3f4f6", paddingTop: hasBudget ? 0 : 8 }}>
          🏥 {k.kostentraeger} {k.versicherungsnummer ? `· ${k.versicherungsnummer}` : ""}
        </div>
      )}
    </div>
  );
}

function KundenDetailSheet({ k, onClose }: { k: KundeDetail; onClose: () => void }) {
  const b45b = toNum(k.budget45b);
  const v45b = toNum(k.verbraucht45b);
  const b45a = toNum(k.budget45a);
  const v45a = toNum(k.verbraucht45a);
  const b39 = toNum(k.budget39);
  const v39 = toNum(k.verbraucht39);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto", padding: 20 }}>
        {/* Griff */}
        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 16px" }} />

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)", borderRadius: 14, padding: 18, marginBottom: 16, color: "#fff" }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🏠</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{k.vorname} {k.nachname}</div>
          {k.geburtsdatum && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>🎂 {formatDate(k.geburtsdatum)}</div>}
          {(k.strasse || k.ort) && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>📍 {[k.strasse, k.plz, k.ort].filter(Boolean).join(", ")}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {k.pflegegrad && <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 700 }}>Pflegegrad {k.pflegegrad}</span>}
            {k.paragraph && <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 700 }}>§{k.paragraph} SGB XI</span>}
          </div>
        </div>

        {/* Kontakt */}
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Kontakt</div>
          {k.telefon && <div style={{ fontSize: 14, marginBottom: 4 }}>📞 {k.telefon}</div>}
          {k.mobil && <div style={{ fontSize: 14, marginBottom: 4 }}>📱 {k.mobil}</div>}
          {k.email && <div style={{ fontSize: 14, marginBottom: 4 }}>✉️ {k.email}</div>}
          {!k.telefon && !k.mobil && !k.email && <div style={{ fontSize: 13, color: "#9ca3af" }}>Keine Kontaktdaten hinterlegt</div>}
        </div>

        {/* Kostenträger */}
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Kostenträger & Versicherung</div>
          {k.kostentraeger && <div style={{ fontSize: 14, marginBottom: 4 }}>🏥 {k.kostentraeger}</div>}
          {k.versicherungsnummer && <div style={{ fontSize: 14, color: "#4b5563" }}>Nr.: {k.versicherungsnummer}</div>}
          {!k.kostentraeger && <div style={{ fontSize: 13, color: "#9ca3af" }}>Keine Angaben</div>}
        </div>

        {/* Budget */}
        <div style={{ background: "#f0faf0", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#4a8c3f", marginBottom: 12 }}>💰 Budget-Übersicht</div>

          {/* §45b */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>§45b SGB XI – Entlastungsleistungen</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Budget</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#4a8c3f" }}>{formatEuro(b45b)}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verbraucht</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{formatEuro(v45b)}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verfügbar</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: b45b - v45b >= 0 ? "#4a8c3f" : "#ef4444" }}>{formatEuro(b45b - v45b)}</div>
              </div>
            </div>
            {k.letzteAbrechnung45b && <div style={{ fontSize: 11, color: "#9ca3af" }}>Letzte Abrechnung: {k.letzteAbrechnung45b}</div>}
            <BudgetBar budget={b45b} verbraucht={v45b} label="45b" />
          </div>

          {/* §45a */}
          {(b45a > 0 || v45a > 0) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>§45a SGB XI – Angebote zur Unterstützung</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Budget</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#4a8c3f" }}>{formatEuro(b45a)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verbraucht</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{formatEuro(v45a)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verfügbar</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: b45a - v45a >= 0 ? "#4a8c3f" : "#ef4444" }}>{formatEuro(b45a - v45a)}</div>
                </div>
              </div>
              {k.letzteAbrechnung45a && <div style={{ fontSize: 11, color: "#9ca3af" }}>Letzte Abrechnung: {k.letzteAbrechnung45a}</div>}
              <BudgetBar budget={b45a} verbraucht={v45a} label="45a" />
            </div>
          )}

          {/* §39 */}
          {(b39 > 0 || v39 > 0) && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>§39 SGB XI – Häusliche Krankenpflege</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Budget</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#4a8c3f" }}>{formatEuro(b39)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verbraucht</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{formatEuro(v39)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verfügbar</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: b39 - v39 >= 0 ? "#4a8c3f" : "#ef4444" }}>{formatEuro(b39 - v39)}</div>
                </div>
              </div>
              {k.letzteAbrechnung39 && <div style={{ fontSize: 11, color: "#9ca3af" }}>Letzte Abrechnung: {k.letzteAbrechnung39}</div>}
              <BudgetBar budget={b39} verbraucht={v39} label="39" />
            </div>
          )}

          {b45b === 0 && v45b === 0 && b45a === 0 && v45a === 0 && b39 === 0 && v39 === 0 && (
            <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "8px 0" }}>Keine Budgetdaten hinterlegt</div>
          )}
        </div>

        <button onClick={onClose} style={{ width: "100%", padding: 14, background: "#f3f4f6", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#4b5563" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}

export default function Kundenliste() {
  const { data: kundenRaw = [] } = trpc.kunden.list.useQuery();
  const kunden = kundenRaw as KundeDetail[];

  const [suche, setSuche] = useState("");
  const [filterPG, setFilterPG] = useState<string>("alle");
  const [filterParagraph, setFilterParagraph] = useState<string>("alle");
  const [sortBy, setSortBy] = useState<"name" | "pflegegrad" | "budget">("name");
  const [selectedKunde, setSelectedKunde] = useState<KundeDetail | null>(null);

  const gefiltert = kunden
    .filter(k => {
      const name = `${k.vorname} ${k.nachname}`.toLowerCase();
      const adresse = [k.strasse, k.plz, k.ort].filter(Boolean).join(" ").toLowerCase();
      const matchSuche = !suche || name.includes(suche.toLowerCase()) || adresse.includes(suche.toLowerCase()) || (k.versicherungsnummer || "").toLowerCase().includes(suche.toLowerCase());
      const matchPG = filterPG === "alle" || String(k.pflegegrad) === filterPG;
      const matchPar = filterParagraph === "alle" || k.paragraph === filterParagraph;
      return matchSuche && matchPG && matchPar;
    })
    .sort((a, b) => {
      if (sortBy === "name") return `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, "de");
      if (sortBy === "pflegegrad") return (b.pflegegrad ?? 0) - (a.pflegegrad ?? 0);
      if (sortBy === "budget") {
        const budA = toNum(a.budget45b) + toNum(a.budget45a) + toNum(a.budget39);
        const budB = toNum(b.budget45b) + toNum(b.budget45a) + toNum(b.budget39);
        return budB - budA;
      }
      return 0;
    });

  // KPI-Werte
  const gesamtBudget45b = kunden.reduce((s, k) => s + toNum(k.budget45b), 0);
  const gesamtVerbraucht45b = kunden.reduce((s, k) => s + toNum(k.verbraucht45b), 0);
  const gesamtBudget39 = kunden.reduce((s, k) => s + toNum(k.budget39), 0);
  const mitBudget = kunden.filter(k => toNum(k.budget45b) > 0 || toNum(k.budget45a) > 0 || toNum(k.budget39) > 0).length;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
  const selectStyle: React.CSSProperties = { padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" };

  return (
    <div className="page-enter" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Kundenliste</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Lebenswert Betreuung – {kunden.length} Kunden</div>
      </div>

      {/* KPI-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)", borderRadius: 12, padding: 14, color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Kunden gesamt</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>{kunden.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{mitBudget} mit Budget</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Budget §45b gesamt</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#4a8c3f", marginTop: 2 }}>{formatEuro(gesamtBudget45b)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Verbraucht: {formatEuro(gesamtVerbraucht45b)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Budget §39 gesamt</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#2a9d8f", marginTop: 2 }}>{formatEuro(gesamtBudget39)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Angezeigt</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#1f2937", marginTop: 2 }}>{gefiltert.length}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>von {kunden.length}</div>
        </div>
      </div>

      {/* Suche */}
      <div style={{ marginBottom: 10 }}>
        <input
          style={inputStyle}
          placeholder="🔍 Name, Adresse oder Versicherungsnr. suchen..."
          value={suche}
          onChange={e => setSuche(e.target.value)}
        />
      </div>

      {/* Filter-Zeile */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select style={selectStyle} value={filterPG} onChange={e => setFilterPG(e.target.value)}>
          <option value="alle">Alle PG</option>
          {[1,2,3,4,5].map(pg => <option key={pg} value={String(pg)}>PG {pg}</option>)}
        </select>
        <select style={selectStyle} value={filterParagraph} onChange={e => setFilterParagraph(e.target.value)}>
          <option value="alle">Alle §§</option>
          <option value="45b">§45b</option>
          <option value="45a">§45a</option>
          <option value="39">§39</option>
          <option value="privat">Privat</option>
        </select>
        <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as "name" | "pflegegrad" | "budget")}>
          <option value="name">A–Z</option>
          <option value="pflegegrad">Pflegegrad ↓</option>
          <option value="budget">Budget ↓</option>
        </select>
      </div>

      {/* Kundenliste */}
      {gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Keine Kunden gefunden</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Suchbegriff oder Filter anpassen</div>
        </div>
      ) : (
        gefiltert.map(k => (
          <KundenKarte key={k.id} k={k} onClick={() => setSelectedKunde(k)} />
        ))
      )}

      {/* Detail-Sheet */}
      {selectedKunde && (
        <KundenDetailSheet k={selectedKunde} onClose={() => setSelectedKunde(null)} />
      )}
    </div>
  );
}
