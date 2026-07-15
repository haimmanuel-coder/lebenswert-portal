import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function fmtMonat(m: string) {
  if (!m) return "–";
  const [y, mo] = m.split("-");
  const n = ["", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  return `${n[parseInt(mo)]} ${y}`;
}

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    geplant: { bg: "#fef3c7", color: "#92400e", label: "Geplant" },
    abgeschlossen: { bg: "#e8f5e4", color: "#4a8c3f", label: "Abgeschlossen" },
    abgesagt: { bg: "#fee2e2", color: "#991b1b", label: "Abgesagt" },
    offen: { bg: "#fef3c7", color: "#92400e", label: "Offen" },
    pruefung: { bg: "#e0f2f0", color: "#2a9d8f", label: "Prüfung" },
    freigegeben: { bg: "#e8f5e4", color: "#4a8c3f", label: "Freigegeben" },
    versendet: { bg: "#f3f4f6", color: "#4b5563", label: "Versendet" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#4b5563", label: status };
  return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

interface Props {
  kundenId: number;
  onBack: () => void;
}

export default function KundenDetail({ kundenId, onBack }: Props) {
  const { data, isLoading } = trpc.kunden.detail.useQuery({ id: kundenId });
  const [activeTab, setActiveTab] = useState<"uebersicht" | "budget" | "stammdaten">("uebersicht");

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div style={{ fontSize: 32, animation: "spin 1s linear infinite" }}>🌿</div>
      </div>
    );
  }

  if (!data?.kunde) {
    return <div style={{ padding: 20, color: "#6b7280" }}>Kunde nicht gefunden.</div>;
  }

  const { kunde, einsaetze, leistungen, fahrten } = data;
  const kundeAny = kunde as Record<string, unknown>;

  return (
    <div className="page-enter">
      {/* Back-Button */}
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4a8c3f", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "0 0 16px 0" }}
      >
        ← Zurück
      </button>

      {/* Kunden-Header */}
      <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)", borderRadius: 16, padding: 20, marginBottom: 16, color: "#fff" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{kunde.vorname} {kunde.nachname}</div>
        {(kunde.strasse || kunde.ort) && (
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            📍 {[kunde.strasse, kunde.plz, kunde.ort].filter(Boolean).join(", ")}
          </div>
        )}
        {kunde.telefon && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>📞 {kunde.telefon}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {kunde.pflegegrad && (
            <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 700 }}>
              Pflegegrad {kunde.pflegegrad}
            </span>
          )}
          {kunde.paragraph && (
            <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 700 }}>
              §{kunde.paragraph} SGB XI
            </span>
          )}
        </div>
      </div>

      {/* Pflichtenheft: drei gleichzeitig sichtbare Informationsspalten auf großen Bildschirmen */}
      <div className="kunden-detail-dreispalten" aria-label="Kundenübersicht in drei Bereichen">
        <section className="kunden-detail-spalte">
          <div className="kunden-detail-spalte-titel">Stammdaten</div>
          <div className="kunden-detail-zeile"><span>Geburtsdatum</span><strong>{fmtDate(kunde.geburtsdatum as string | null)}</strong></div>
          <div className="kunden-detail-zeile"><span>Pflegegrad</span><strong>{kunde.pflegegrad ? `Pflegegrad ${kunde.pflegegrad}` : "–"}</strong></div>
          <div className="kunden-detail-zeile"><span>Telefon</span><strong>{kunde.telefon || "–"}</strong></div>
          <div className="kunden-detail-zeile"><span>Kostenträger</span><strong>{kunde.kostentraeger || "–"}</strong></div>
        </section>
        <section className="kunden-detail-spalte">
          <div className="kunden-detail-spalte-titel">Nächste Einsätze</div>
          {einsaetze.length === 0 ? <p className="kunden-detail-leer">Keine Einsätze geplant.</p> : einsaetze.slice(0, 4).map(e => (
            <div key={e.id} className="kunden-detail-termin">
              <div><strong>{fmtDate(e.datum as string | Date)}</strong><span>{(e.startzeit || "").slice(0, 5) || "Zeit offen"} · {e.dauerStunden || "–"} Std.</span></div>
              {statusBadge(e.status)}
            </div>
          ))}
        </section>
        <section className="kunden-detail-spalte">
          <div className="kunden-detail-spalte-titel">Budget & Nachweise</div>
          {["45b", "45a", "39"].map(par => {
            const budget = Number(kundeAny[`budget${par}`] || 0);
            const verbraucht = Number(kundeAny[`verbraucht${par}`] || 0);
            if (!budget) return null;
            return <div key={par} className="kunden-detail-budget"><span>§{par}</span><strong>{Math.max(0, budget - verbraucht).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} frei</strong></div>;
          })}
          <div className="kunden-detail-zeile"><span>Leistungsnachweise</span><strong>{leistungen.length}</strong></div>
          <div className="kunden-detail-zeile"><span>Fahrten</span><strong>{fahrten.length}</strong></div>
        </section>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#f4f6f3", borderRadius: 12, padding: 4 }}>
        {(["uebersicht", "budget", "stammdaten"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: "8px 4px", border: "none", borderRadius: 9, cursor: "pointer",
              fontSize: 11, fontWeight: 700,
              background: activeTab === t ? "#4a8c3f" : "transparent",
              color: activeTab === t ? "#fff" : "#6b7280",
              transition: "all 0.15s",
            }}
          >
            {t === "uebersicht" ? "📅 Übersicht" : t === "budget" ? "💰 Budget" : "📄 Stammdaten"}
          </button>
        ))}
      </div>

      {/* TAB: ÜBERSICHT */}
      {activeTab === "uebersicht" && (
        <div className="page-enter">
          {/* Statistik-Karten */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { icon: "📅", label: "Einsätze", value: einsaetze.length },
              { icon: "📋", label: "Nachweise", value: leistungen.length },
              { icon: "🚗", label: "Fahrten", value: fahrten.length },
            ].map((k) => (
              <div key={k.label} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{k.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#4a8c3f" }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Einsätze */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📅 Einsätze ({einsaetze.length})</div>
            {einsaetze.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Keine Einsätze.</p>
            ) : (
              einsaetze.slice(0, 10).map((e) => {
                const datum = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
                return (
                  <div key={e.id} style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,.06)", padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(datum)} · {(e.startzeit || "").slice(0, 5)} Uhr</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{e.dauerStunden}h · §{e.paragraph} SGB XI</div>
                    </div>
                    {statusBadge(e.status)}
                  </div>
                );
              })
            )}
            {einsaetze.length > 10 && (
              <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 4 }}>+{einsaetze.length - 10} weitere</div>
            )}
          </div>

          {/* Leistungsnachweise */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📋 Leistungsnachweise ({leistungen.length})</div>
            {leistungen.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Keine Nachweise.</p>
            ) : (
              leistungen.slice(0, 10).map((l) => (
                <div key={l.id} style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,.06)", padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtMonat(l.monat)} · §{l.paragraph} SGB XI</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{l.stunden}h · {l.anzahlEinsaetze} Einsätze</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#4a8c3f" }}>{parseFloat(String(l.betrag || 0)).toFixed(2)} €</div>
                    {statusBadge(l.status)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Fahrten */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🚗 Fahrten ({fahrten.length})</div>
            {fahrten.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Keine Fahrten.</p>
            ) : (
              fahrten.slice(0, 10).map((f) => {
                const datum = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
                return (
                  <div key={f.id} style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,.06)", padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.vonOrt} → {f.nachOrt}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(datum)} · {parseFloat(String(f.kilometer ?? 0)).toFixed(1)} km</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#4a8c3f" }}>{parseFloat(String(f.verguetung ?? 0)).toFixed(2)} €</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: BUDGET */}
      {activeTab === "budget" && (
        <div className="page-enter">
          {["45b", "45a", "39"].map((par) => {
            const budget = parseFloat(String(kundeAny[`budget${par}`] ?? 0));
            const verbraucht = parseFloat(String(kundeAny[`verbraucht${par}`] ?? 0));
            const rest = Math.max(0, budget - verbraucht);
            const pct = budget > 0 ? Math.min(100, (verbraucht / budget) * 100) : 0;
            const isKritisch = budget > 0 && pct >= 90;
            const label = par === "45b" ? "§45b SGB XI" : par === "45a" ? "§45a SGB XI" : "§39 SGB XI";
            const desc = par === "45b" ? "Entlastungsbetrag" : par === "45a" ? "Betreuungsleistungen" : "Häusliche Pflege";
            if (budget === 0) return null;
            return (
              <div key={par} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: isKritisch ? "#dc2626" : "#1a2e1a" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{desc}</div>
                  </div>
                  {isKritisch && (
                    <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>⚠️ Kritisch</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {[
                    { label: "Budget", value: `${budget.toFixed(0)} €`, color: "#4a8c3f" },
                    { label: "Verbraucht", value: `${verbraucht.toFixed(0)} €`, color: isKritisch ? "#dc2626" : "#92400e" },
                    { label: "Rest", value: `${rest.toFixed(0)} €`, color: rest < 100 ? "#dc2626" : "#2a9d8f" },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: "center", background: "#f9fafb", borderRadius: 8, padding: "8px 4px" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: isKritisch ? "#dc2626" : "#4a8c3f", width: `${pct}%`, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, textAlign: "right" }}>{pct.toFixed(0)}% verbraucht</div>
              </div>
            );
          })}

          {/* Kostenträger */}
          {kunde.kostentraeger && (
            <div style={{ background: "#eff6ff", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>🏥 Kostenträger</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{kunde.kostentraeger}</div>
              {kunde.versicherungsnummer && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Vers.-Nr.: {kunde.versicherungsnummer}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: STAMMDATEN */}
      {activeTab === "stammdaten" && (
        <div className="page-enter">
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#1a2e1a" }}>📄 Persönliche Daten</div>
            {[
              { label: "Geburtsdatum", value: fmtDate(kunde.geburtsdatum as string | null) },
              { label: "Pflegegrad", value: kunde.pflegegrad ? `Pflegegrad ${kunde.pflegegrad}` : "–" },
              { label: "Paragraph", value: kunde.paragraph ? `§${kunde.paragraph} SGB XI` : "–" },
              { label: "Telefon", value: kunde.telefon || "–" },
              { label: "Mobil", value: (kundeAny.mobil as string) || "–" },
              { label: "E-Mail", value: (kundeAny.email as string) || "–" },
              { label: "Adresse", value: [kunde.strasse, kunde.plz, kunde.ort].filter(Boolean).join(", ") || "–" },
              { label: "Versicherungsnummer", value: kunde.versicherungsnummer || "–" },
              { label: "Kostenträger", value: kunde.kostentraeger || "–" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2e1a", textAlign: "right", maxWidth: "55%" }}>{row.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const adresse = `${kunde.vorname} ${kunde.nachname}\n${[kunde.strasse, kunde.plz, kunde.ort].filter(Boolean).join(", ")}\n${kunde.telefon || ""}`;
              navigator.clipboard.writeText(adresse);
              toast.success("Adresse kopiert!");
            }}
            style={{ width: "100%", padding: 12, background: "#e8f5e4", color: "#4a8c3f", border: "2px solid #4a8c3f", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            📋 Adresse kopieren
          </button>
        </div>
      )}
    </div>
  );
}
