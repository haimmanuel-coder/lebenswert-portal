/**
 * ════════════════════════════════════════════════════════════════════════════
 *  KALENDER – Gesamtübersicht aller Termine und Abwesenheiten
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Zeigt in einem Monatskalender:
 *   • alle Kundentermine (farblich nach Mitarbeiter gekennzeichnet)
 *   • genehmigte Urlaube
 *   • Krankmeldungen
 *   • Fortbildungen (aus den Mitarbeiterdokumenten)
 *   • gesetzliche Feiertage
 *   • geplante Touren
 *   • freie Zeiten (Tage ohne Termin und ohne Abwesenheit)
 *
 * Über die Mitarbeiterauswahl lässt sich der Kalender auf eine Person
 * einschränken. Mitarbeiter sehen ausschließlich ihre eigenen Termine.
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useNavigation } from "@/contexts/NavigationContext";
import AuswahlFeld, { mitarbeiterZuOptionen } from "@/components/AuswahlFeld";
import {
  formatEuro,
  formatStunden,
  getFeiertag,
  getMitarbeiterFarbe,
  liegtImZeitraum,
  zuDatumsString,
} from "@shared/planungsLogik";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const STATUS_STIL: Record<string, { hintergrund: string; farbe: string; punkt: string; label: string }> = {
  geplant: { hintergrund: "#eff6ff", farbe: "#1d4ed8", punkt: "#3b82f6", label: "Geplant" },
  bestaetigt: { hintergrund: "#f0fdf4", farbe: "#15803d", punkt: "#22c55e", label: "Bestätigt" },
  abgeschlossen: { hintergrund: "#ecfdf5", farbe: "#047857", punkt: "#10b981", label: "Abgeschlossen" },
  abgesagt: { hintergrund: "#fef2f2", farbe: "#b91c1c", punkt: "#ef4444", label: "Abgesagt" },
  aenderung_angefragt: { hintergrund: "#fefce8", farbe: "#a16207", punkt: "#eab308", label: "Änderung angefragt" },
};

function tageImMonat(jahr: number, monat: number) {
  return new Date(jahr, monat + 1, 0).getDate();
}

/** Wochentag des Monatsersten, Montag = 0. */
function ersterWochentag(jahr: number, monat: number) {
  const tag = new Date(jahr, monat, 1).getDay();
  return tag === 0 ? 6 : tag - 1;
}

export default function Kalender() {
  const jetzt = new Date();
  const { mitarbeiter } = usePortalAuth();
  const { navigiere } = useNavigation();
  const [jahr, setJahr] = useState(jetzt.getFullYear());
  const [monat, setMonat] = useState(jetzt.getMonth());
  const [gewaehlterTag, setGewaehlterTag] = useState<string | null>(null);
  const [filterMitarbeiterId, setFilterMitarbeiterId] = useState<number | null>(null);

  const heute = zuDatumsString(jetzt);
  const monatsSchluessel = `${jahr}-${String(monat + 1).padStart(2, "0")}`;
  const ersterTag = `${monatsSchluessel}-01`;

  const darfAlleSehen =
    mitarbeiter?.rolle === "admin" || mitarbeiter?.rolle === "teamleitung" || mitarbeiter?.rolle === "buchhaltung";

  // Vollständige Monatsplanung: Termine, Abwesenheiten, Touren
  const {
    data: planung,
    isLoading,
    isError,
    refetch,
  } = (trpc as any).planung.uebersicht.useQuery({
    ansicht: "monat",
    startDatum: ersterTag,
    mitarbeiterId: filterMitarbeiterId,
  });

  const { data: mitarbeiterListe = [] } = (trpc as any).planung.mitarbeiterListe.useQuery();
  const mitarbeiterOptionen = useMemo(
    () => mitarbeiterZuOptionen(mitarbeiterListe as any[], getMitarbeiterFarbe),
    [mitarbeiterListe],
  );

  // Termine nach Datum gruppieren
  const termineNachTag = useMemo(() => {
    const karte: Record<string, any[]> = {};
    for (const termin of ((planung?.termine ?? []) as any[])) {
      (karte[termin.datum] ??= []).push(termin);
    }
    Object.values(karte).forEach((liste) =>
      liste.sort((a, b) => (a.startzeit ?? "").localeCompare(b.startzeit ?? "")),
    );
    return karte;
  }, [planung]);

  const abwesenheitenAmTag = (datum: string) =>
    ((planung?.abwesenheiten ?? []) as any[]).filter((a) => liegtImZeitraum(datum, a.von, a.bis));

  const tourenAmTag = (datum: string) =>
    ((planung?.touren ?? []) as any[]).filter((t) => t.datum === datum);

  const anzahlTage = tageImMonat(jahr, monat);
  const startSpalte = ersterWochentag(jahr, monat);

  const vorherigerMonat = () => {
    if (monat === 0) { setJahr((j) => j - 1); setMonat(11); } else setMonat((m) => m - 1);
    setGewaehlterTag(null);
  };
  const naechsterMonat = () => {
    if (monat === 11) { setJahr((j) => j + 1); setMonat(0); } else setMonat((m) => m + 1);
    setGewaehlterTag(null);
  };

  // Monatsstatistik
  const statistik = useMemo(() => {
    const termine = (planung?.termine ?? []) as any[];
    const aktive = termine.filter((t) => t.status !== "abgesagt");
    // Freie Tage: Werktage ohne Termin und ohne Abwesenheit
    let freieTage = 0;
    for (let tag = 1; tag <= anzahlTage; tag++) {
      const datum = `${monatsSchluessel}-${String(tag).padStart(2, "0")}`;
      const wochentag = new Date(`${datum}T12:00:00`).getDay();
      if (wochentag === 0 || wochentag === 6) continue;
      if (getFeiertag(datum)) continue;
      if ((termineNachTag[datum]?.length ?? 0) > 0) continue;
      if (abwesenheitenAmTag(datum).length > 0) continue;
      freieTage++;
    }
    return {
      gesamt: termine.length,
      abgeschlossen: termine.filter((t) => t.status === "abgeschlossen").length,
      geplant: termine.filter((t) => t.status === "geplant" || t.status === "bestaetigt").length,
      abgesagt: termine.filter((t) => t.status === "abgesagt").length,
      stunden: aktive.reduce((s, t) => s + (t.stunden ?? 0), 0),
      lohnkosten: aktive.reduce((s, t) => s + (t.lohnkosten ?? 0), 0),
      freieTage,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planung, termineNachTag, anzahlTage, monatsSchluessel]);

  const tagesTermine = gewaehlterTag ? (termineNachTag[gewaehlterTag] ?? []) : [];
  const tagesAbwesenheiten = gewaehlterTag ? abwesenheitenAmTag(gewaehlterTag) : [];
  const tagesTouren = gewaehlterTag ? tourenAmTag(gewaehlterTag) : [];

  return (
    <div style={{ padding: "20px 16px", maxWidth: 860, margin: "0 auto" }}>
      {/* Kopfbereich */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>📆 Kalender</h1>
        <p style={{ fontSize: 12.5, color: "#6b7280", margin: "4px 0 0" }}>
          Termine, Urlaube, Krankmeldungen, Feiertage und Touren im Überblick
        </p>
      </div>

      {/* Mitarbeiterfilter */}
      {darfAlleSehen && (
        <div style={{ maxWidth: 320, marginBottom: 12 }}>
          <AuswahlFeld
            optionen={mitarbeiterOptionen}
            wert={filterMitarbeiterId}
            onChange={setFilterMitarbeiterId}
            platzhalter="Alle Mitarbeiter"
            suchPlatzhalter="Mitarbeiter suchen …"
            loeschbar
          />
        </div>
      )}

      {/* Monatsstatistik */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { label: "Termine", wert: String(statistik.gesamt), hintergrund: "#f3f4f6", farbe: "#374151" },
          { label: "Erledigt", wert: String(statistik.abgeschlossen), hintergrund: "#d1fae5", farbe: "#166534" },
          { label: "Geplant", wert: String(statistik.geplant), hintergrund: "#dbeafe", farbe: "#1e40af" },
          { label: "Abgesagt", wert: String(statistik.abgesagt), hintergrund: "#fee2e2", farbe: "#dc2626" },
          { label: "Stunden", wert: formatStunden(statistik.stunden), hintergrund: "#ede9fe", farbe: "#6d28d9" },
          { label: "Freie Tage", wert: String(statistik.freieTage), hintergrund: "#fef9c3", farbe: "#854d0e" },
        ].map((karte) => (
          <div
            key={karte.label}
            style={{ background: karte.hintergrund, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: karte.farbe }}>{karte.wert}</div>
            <div style={{ fontSize: 9.5, color: karte.farbe, fontWeight: 700, textTransform: "uppercase" }}>
              {karte.label}
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 20, color: "#9ca3af" }}>⏳ Kalender wird geladen …</div>
      )}
      {isError && (
        <div
          style={{
            textAlign: "center",
            padding: 16,
            color: "#dc2626",
            background: "#fee2e2",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          ❌ Kalenderdaten konnten nicht geladen werden
          <button
            onClick={() => refetch()}
            style={{
              marginLeft: 12,
              padding: "4px 12px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Erneut
          </button>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={vorherigerMonat} style={monatsButtonStil}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1a2e1a" }}>
          {MONATE[monat]} {jahr}
        </span>
        <button onClick={naechsterMonat} style={monatsButtonStil}>›</button>
      </div>

      {/* Kalenderraster */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #e5e7eb",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#4a8c3f" }}>
          {WOCHENTAGE.map((tag) => (
            <div key={tag} style={{ textAlign: "center", padding: "8px 2px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
              {tag}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: startSpalte }).map((_, i) => (
            <div
              key={`leer-${i}`}
              style={{ minHeight: 76, borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}
            />
          ))}

          {Array.from({ length: anzahlTage }).map((_, i) => {
            const tag = i + 1;
            const datum = `${monatsSchluessel}-${String(tag).padStart(2, "0")}`;
            const termine = termineNachTag[datum] ?? [];
            const abwesende = abwesenheitenAmTag(datum);
            const feiertag = getFeiertag(datum);
            const istHeute = datum === heute;
            const istGewaehlt = datum === gewaehlterTag;
            const wochenende = (startSpalte + i) % 7 >= 5;

            return (
              <div
                key={tag}
                onClick={() => setGewaehlterTag(istGewaehlt ? null : datum)}
                style={{
                  minHeight: 76,
                  borderRight: "1px solid #f3f4f6",
                  borderBottom: "1px solid #f3f4f6",
                  padding: "4px 4px 5px",
                  cursor: "pointer",
                  background: istGewaehlt
                    ? "#f0fdf4"
                    : feiertag
                      ? "#fff7ed"
                      : istHeute
                        ? "#fefce8"
                        : wochenende
                          ? "#fafafa"
                          : "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: istHeute ? 800 : 500,
                    color: istHeute ? "#4a8c3f" : wochenende ? "#9ca3af" : "#374151",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 21,
                    height: 21,
                    borderRadius: "50%",
                    background: istHeute ? "#d1fae5" : "transparent",
                  }}
                >
                  {tag}
                </div>

                {feiertag && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: "#c2410c",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 2,
                    }}
                    title={feiertag}
                  >
                    🎌 {feiertag}
                  </div>
                )}

                {/* Abwesenheitsbalken */}
                {abwesende.slice(0, 2).map((a: any, index: number) => (
                  <div
                    key={`abw-${index}`}
                    title={`${a.mitarbeiterName}: ${a.typ === "urlaub" ? "Urlaub" : "krank"} (${a.von} – ${a.bis})`}
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      borderRadius: 3,
                      padding: "1px 3px",
                      marginBottom: 1.5,
                      background: a.typ === "urlaub" ? "#fef9c3" : "#fee2e2",
                      color: a.typ === "urlaub" ? "#854d0e" : "#b91c1c",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.typ === "urlaub" ? "🌴" : "🤒"} {a.mitarbeiterName.split(" ")[0]}
                  </div>
                ))}

                {/* Terminbalken – farblich nach Mitarbeiter */}
                {termine.slice(0, 2).map((termin: any) => (
                  <div
                    key={termin.id}
                    title={`${termin.startzeit}–${termin.endzeit} ${termin.kundenName} (${termin.mitarbeiterName})`}
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      borderRadius: 3,
                      padding: "1px 3px",
                      marginBottom: 1.5,
                      background: "#f3f4f6",
                      borderLeft: `3px solid ${getMitarbeiterFarbe(termin.mitarbeiterId)}`,
                      color: "#374151",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      opacity: termin.status === "abgesagt" ? 0.5 : 1,
                    }}
                  >
                    {termin.startzeit} {termin.kundenName.split(" ")[0]}
                  </div>
                ))}

                {termine.length + abwesende.length > 4 && (
                  <div style={{ fontSize: 8, color: "#6b7280", fontWeight: 700 }}>
                    +{termine.length + abwesende.length - 4} weitere
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legende */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 11, color: "#6b7280" }}>
        {[
          { farbe: "#fef9c3", rand: "#854d0e", label: "🌴 Urlaub" },
          { farbe: "#fee2e2", rand: "#b91c1c", label: "🤒 Krank" },
          { farbe: "#fff7ed", rand: "#c2410c", label: "🎌 Feiertag" },
          { farbe: "#f3f4f6", rand: "#4a8c3f", label: "📋 Termin (Farbe = Mitarbeiter)" },
          { farbe: "#fefce8", rand: "#4a8c3f", label: "Heute" },
        ].map((eintrag) => (
          <div key={eintrag.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: eintrag.farbe,
                borderLeft: `3px solid ${eintrag.rand}`,
              }}
            />
            <span>{eintrag.label}</span>
          </div>
        ))}
      </div>

      {/* Tagesdetail */}
      {gewaehlterTag && (
        <div
          style={{
            marginTop: 16,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1a2e1a" }}>
              📋{" "}
              {new Date(`${gewaehlterTag}T12:00:00`).toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            <button
              onClick={() => navigiere("planung")}
              style={{
                padding: "6px 12px",
                background: "#e8f5e4",
                color: "#2d6a27",
                border: "none",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              In der Einsatzplanung öffnen ›
            </button>
          </div>

          {getFeiertag(gewaehlterTag) && (
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#c2410c",
                borderRadius: 8,
                padding: "8px 11px",
                fontSize: 12.5,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              🎌 Gesetzlicher Feiertag: {getFeiertag(gewaehlterTag)}
            </div>
          )}

          {tagesAbwesenheiten.map((a: any, index: number) => (
            <div
              key={`d-abw-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                padding: "9px 12px",
                marginBottom: 6,
                background: a.typ === "urlaub" ? "#fef9c3" : "#fee2e2",
                color: a.typ === "urlaub" ? "#854d0e" : "#b91c1c",
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 16 }}>{a.typ === "urlaub" ? "🌴" : "🤒"}</span>
              <div style={{ flex: 1 }}>
                <strong>{a.mitarbeiterName}</strong> – {a.typ === "urlaub" ? "Urlaub" : "krankgemeldet"}
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  {a.von} bis {a.bis}
                  {a.notizen ? ` · ${a.notizen}` : ""}
                </div>
              </div>
            </div>
          ))}

          {tagesTouren.length > 0 && (
            <div
              style={{
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                borderRadius: 8,
                padding: "8px 11px",
                fontSize: 12.5,
                color: "#3730a3",
                marginBottom: 8,
              }}
            >
              🗺️ {tagesTouren.length} geplante Tour{tagesTouren.length > 1 ? "en" : ""}:{" "}
              {tagesTouren.map((t: any) => `${t.mitarbeiterName} (${t.punkte?.length ?? 0} Stationen)`).join(", ")}
            </div>
          )}

          {tagesTermine.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              {tagesAbwesenheiten.length > 0
                ? "Keine Termine – der Tag ist durch Abwesenheiten belegt."
                : "Keine Termine an diesem Tag (freier Tag)."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tagesTermine.map((termin: any) => {
                const stil = STATUS_STIL[termin.status] ?? STATUS_STIL.geplant;
                return (
                  <div
                    key={termin.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: stil.hintergrund,
                      borderRadius: 8,
                      padding: "10px 12px",
                      borderLeft: `4px solid ${getMitarbeiterFarbe(termin.mitarbeiterId)}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: stil.farbe }}>
                        {termin.startzeit}–{termin.endzeit} · {termin.kundenName}
                      </div>
                      <div style={{ fontSize: 11.5, color: stil.farbe, opacity: 0.85, marginTop: 2 }}>
                        {termin.mitarbeiterName} · §{termin.paragraph}
                        {termin.paragraph2 ? ` + §${termin.paragraph2}` : ""} ·{" "}
                        {formatStunden(termin.stunden)} · {formatEuro(termin.lohnkosten)} Lohn
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: stil.farbe, flexShrink: 0 }}>
                      {stil.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const monatsButtonStil: React.CSSProperties = {
  background: "#f3f4f6",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 16,
  cursor: "pointer",
  fontWeight: 700,
};
