import { trpc } from "@/lib/trpc";

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
  return <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
};

interface Props {
  kundenId: number;
  onBack: () => void;
}

export default function KundenDetail({ kundenId, onBack }: Props) {
  const { data, isLoading } = trpc.kunden.detail.useQuery({ id: kundenId });

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
        {kunde.adresse && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>📍 {kunde.adresse}</div>}
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
        {einsaetze.length > 10 && <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 4 }}>+{einsaetze.length - 10} weitere</div>}
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
  );
}
