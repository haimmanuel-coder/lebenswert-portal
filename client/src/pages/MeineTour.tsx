/**
 * ════════════════════════════════════════════════════════════════════════════
 *  MEINE TOUR – manuelle Tourenplanung durch den Mitarbeiter
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Die Tourenplanung wird nicht automatisch erzeugt, sondern vom jeweiligen
 * Mitarbeiter selbst festgelegt. Er kennt Verkehr, Kundenwünsche und
 * kurzfristige Änderungen am besten.
 *
 * Funktionen:
 *   • Tages-, Wochen- und Monatsansicht der eigenen Einsätze
 *   • Reihenfolge der Besuche per Drag-and-Drop (oder ▲▼ auf Mobilgeräten)
 *   • Gespeicherte Reihenfolge ist für Teamleitung und Verwaltung sichtbar
 *   • Je Tourenpunkt: Kunde, Adresse, Telefon, Zeitfenster, Dauer,
 *     Abrechnungsparagraph(en), Hinweise und Status
 *   • Navigation per Google Maps / Apple Karten direkt aus dem Tourenpunkt
 *   • Optionaler Routenvorschlag – die Entscheidung bleibt beim Mitarbeiter
 *
 * Rechte:
 *   Mitarbeiter ändern ausschließlich die Reihenfolge ihrer eigenen Tour.
 *   Einsatzzeiten und Kundenzuweisungen bleiben unangetastet.
 *   Teamleitung und Administrator sehen und ordnen alle Touren.
 */

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";
import AuswahlFeld, { mitarbeiterZuOptionen } from "@/components/AuswahlFeld";
import {
  addTage,
  formatEuro,
  formatStunden,
  getFeiertag,
  getMitarbeiterFarbe,
  montagDerWoche,
  zuDatumsString,
} from "@shared/planungsLogik";

const WOCHENTAGE_LANG = [
  "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag",
];

const STATUS_TEXTE: Record<string, { label: string; farbe: string; hintergrund: string }> = {
  geplant: { label: "Geplant", farbe: "#1d4ed8", hintergrund: "#eff6ff" },
  bestaetigt: { label: "Bestätigt", farbe: "#15803d", hintergrund: "#f0fdf4" },
  abgeschlossen: { label: "Abgeschlossen", farbe: "#047857", hintergrund: "#ecfdf5" },
  abgesagt: { label: "Abgesagt", farbe: "#b91c1c", hintergrund: "#fef2f2" },
  aenderung_angefragt: { label: "Änderung angefragt", farbe: "#a16207", hintergrund: "#fefce8" },
};

function langesDatum(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  return `${WOCHENTAGE_LANG[(d.getDay() + 6) % 7]}, ${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}.${d.getFullYear()}`;
}

/** Baut einen Navigations-Link, der auf iOS Apple Karten und sonst Google Maps öffnet. */
function navigationsLink(adresse: string): string {
  const ziel = encodeURIComponent(adresse);
  const istApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  return istApple ? `https://maps.apple.com/?daddr=${ziel}` : `https://www.google.com/maps/dir/?api=1&destination=${ziel}`;
}

export default function MeineTour() {
  const { mitarbeiter } = usePortalAuth();
  const heute = zuDatumsString(new Date());

  const [ansicht, setAnsicht] = useState<"tag" | "woche" | "monat">("tag");
  const [datum, setDatum] = useState(heute);
  const [gewaehlterMitarbeiter, setGewaehlterMitarbeiter] = useState<number | null>(null);
  /** Lokale Reihenfolge während des Sortierens (noch nicht gespeichert). */
  const [reihenfolge, setReihenfolge] = useState<number[]>([]);
  const [ziehtId, setZiehtId] = useState<number | null>(null);
  const [ungespeichert, setUngespeichert] = useState(false);

  const darfAlleSehen = mitarbeiter?.rolle === "admin" || mitarbeiter?.rolle === "teamleitung";
  const zielMitarbeiterId = gewaehlterMitarbeiter ?? mitarbeiter?.id ?? null;

  const { data: mitarbeiterListe = [] } = (trpc as any).planung.mitarbeiterListe.useQuery();
  const mitarbeiterOptionen = useMemo(
    () => mitarbeiterZuOptionen(mitarbeiterListe as any[], getMitarbeiterFarbe),
    [mitarbeiterListe],
  );

  // Tagesansicht: exakte Tour mit gespeicherter Reihenfolge
  const {
    data: tagesTour,
    isLoading: tourLaedt,
    refetch: tourNeuLaden,
  } = (trpc as any).planung.touren.tagesTour.useQuery(
    { datum, mitarbeiterId: zielMitarbeiterId },
    { enabled: ansicht === "tag" && Boolean(zielMitarbeiterId) },
  );

  // Wochen-/Monatsansicht: Übersicht über den Zeitraum
  const zeitraumStart = ansicht === "woche" ? montagDerWoche(datum) : `${datum.slice(0, 7)}-01`;
  const { data: uebersicht, isLoading: uebersichtLaedt } = (trpc as any).planung.uebersicht.useQuery(
    {
      ansicht: ansicht === "woche" ? "woche" : "monat",
      startDatum: zeitraumStart,
      mitarbeiterId: zielMitarbeiterId,
    },
    { enabled: ansicht !== "tag" },
  );

  const speichern = (trpc as any).planung.touren.speichereReihenfolge.useMutation({
    onSuccess: () => {
      toast.success("Reihenfolge gespeichert – für die Teamleitung sichtbar.");
      setUngespeichert(false);
      tourNeuLaden();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Serverreihenfolge übernehmen, solange nichts Ungespeichertes vorliegt
  useEffect(() => {
    if (!tagesTour?.punkte) return;
    if (ungespeichert) return;
    setReihenfolge((tagesTour.punkte as any[]).map((p) => p.id));
  }, [tagesTour, ungespeichert]);

  const punkte = useMemo(() => {
    const alle = ((tagesTour?.punkte ?? []) as any[]);
    if (reihenfolge.length === 0) return alle;
    const karte = new Map(alle.map((p) => [p.id, p]));
    const sortiert = reihenfolge.map((id) => karte.get(id)).filter(Boolean) as any[];
    // Neu hinzugekommene Einsätze hinten anhängen
    for (const punkt of alle) {
      if (!reihenfolge.includes(punkt.id)) sortiert.push(punkt);
    }
    return sortiert;
  }, [tagesTour, reihenfolge]);

  const darfSortieren = Boolean(tagesTour?.darfReihenfolgeAendern);

  // ── Reihenfolge ändern ────────────────────────────────────────────────────
  const verschiebe = (vonIndex: number, nachIndex: number) => {
    if (!darfSortieren) return;
    if (nachIndex < 0 || nachIndex >= punkte.length) return;
    const neue = punkte.map((p) => p.id);
    const [bewegt] = neue.splice(vonIndex, 1);
    neue.splice(nachIndex, 0, bewegt);
    setReihenfolge(neue);
    setUngespeichert(true);
  };

  const speichernAusloesen = () => {
    if (!zielMitarbeiterId) return;
    speichern.mutate({
      datum,
      mitarbeiterId: zielMitarbeiterId,
      einsatzIds: punkte.map((p) => p.id),
    });
  };

  /**
   * Routenvorschlag: sortiert nach Startzeit und gruppiert gleiche Orte.
   * Der Vorschlag wird nur eingetragen – gespeichert wird erst auf
   * ausdrückliche Bestätigung des Mitarbeiters.
   */
  const routenVorschlag = () => {
    const vorschlag = [...punkte].sort((a, b) => {
      const zeit = (a.startzeit ?? "").localeCompare(b.startzeit ?? "");
      if (zeit !== 0) return zeit;
      return (a.kundenAdresse ?? "").localeCompare(b.kundenAdresse ?? "");
    });
    setReihenfolge(vorschlag.map((p) => p.id));
    setUngespeichert(true);
    toast.info("Routenvorschlag eingetragen – bitte prüfen und bei Bedarf anpassen.");
  };

  const tagesSumme = useMemo(
    () => ({
      stunden: punkte.reduce((s, p) => s + (p.stunden ?? 0), 0),
      lohn: punkte.reduce((s, p) => s + (p.lohnkosten ?? 0), 0),
    }),
    [punkte],
  );

  // ── Darstellung ───────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>Meine Tour</div>
        <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
          Reihenfolge der Besuche selbst festlegen – Zeiten und Zuweisungen bleiben unverändert.
        </div>
      </div>

      {/* Steuerleiste */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          background: "#fff",
          padding: 10,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,.05)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { key: "tag", label: "Tag" },
            { key: "woche", label: "Woche" },
            { key: "monat", label: "Monat" },
          ] as const).map((option) => (
            <button
              key={option.key}
              onClick={() => setAnsicht(option.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                background: ansicht === option.key ? "#e8f5e4" : "#f3f4f6",
                color: ansicht === option.key ? "#2d6a27" : "#4b5563",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={datum}
          onChange={(e) => {
            setDatum(e.target.value);
            setUngespeichert(false);
          }}
          style={{
            padding: "7px 10px",
            border: "1.5px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
          }}
        />

        <button onClick={() => { setDatum(addTage(datum, -1)); setUngespeichert(false); }} style={navStil}>‹</button>
        <button onClick={() => { setDatum(heute); setUngespeichert(false); }} style={{ ...navStil, width: "auto", padding: "6px 12px" }}>Heute</button>
        <button onClick={() => { setDatum(addTage(datum, 1)); setUngespeichert(false); }} style={navStil}>›</button>

        {darfAlleSehen && (
          <div style={{ minWidth: 200, flex: 1, maxWidth: 280 }}>
            <AuswahlFeld
              optionen={mitarbeiterOptionen}
              wert={gewaehlterMitarbeiter}
              onChange={(id) => { setGewaehlterMitarbeiter(id); setUngespeichert(false); }}
              platzhalter="Eigene Tour"
              suchPlatzhalter="Mitarbeiter suchen …"
              loeschbar
            />
          </div>
        )}
      </div>

      {/* ── Tagesansicht ──────────────────────────────────────────────── */}
      {ansicht === "tag" && (
        <>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{langesDatum(datum)}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {punkte.length} Besuche · {formatStunden(tagesSumme.stunden)} · {formatEuro(tagesSumme.lohn)} Lohn
                {getFeiertag(datum) && (
                  <span style={{ color: "#c2410c", fontWeight: 700 }}> · 🎌 {getFeiertag(datum)}</span>
                )}
              </div>
            </div>
            {darfSortieren && punkte.length > 1 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={routenVorschlag} style={{ ...aktionStil, background: "#eff6ff", color: "#1d4ed8" }}>
                  Routenvorschlag
                </button>
                <button
                  onClick={speichernAusloesen}
                  disabled={!ungespeichert || speichern.isPending}
                  style={{
                    ...aktionStil,
                    background: ungespeichert ? "#4a8c3f" : "#e5e7eb",
                    color: ungespeichert ? "#fff" : "#9ca3af",
                    cursor: ungespeichert ? "pointer" : "default",
                  }}
                >
                  {speichern.isPending ? "Speichert …" : ungespeichert ? "Reihenfolge speichern" : "Gespeichert"}
                </button>
              </div>
            )}
          </div>

          {ungespeichert && (
            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fcd34d",
                color: "#92400e",
                borderRadius: 10,
                padding: "9px 12px",
                marginBottom: 10,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Die geänderte Reihenfolge ist noch nicht gespeichert.
            </div>
          )}

          {tourLaedt ? (
            <div style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>Tour wird geladen …</div>
          ) : punkte.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontWeight: 600 }}>Keine Einsätze an diesem Tag</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {punkte.map((punkt, index) => {
                const status = STATUS_TEXTE[punkt.status] ?? STATUS_TEXTE.geplant;
                return (
                  <div
                    key={punkt.id}
                    draggable={darfSortieren}
                    onDragStart={() => setZiehtId(punkt.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (ziehtId === null) return;
                      const vonIndex = punkte.findIndex((p) => p.id === ziehtId);
                      if (vonIndex >= 0 && vonIndex !== index) verschiebe(vonIndex, index);
                      setZiehtId(null);
                    }}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 2px 10px rgba(0,0,0,.07)",
                      borderLeft: `5px solid ${getMitarbeiterFarbe(punkt.mitarbeiterId)}`,
                      padding: 14,
                      opacity: ziehtId === punkt.id ? 0.45 : 1,
                      cursor: darfSortieren ? "grab" : "default",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Positionsnummer */}
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: "#4a8c3f",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800 }}>{punkt.kundenName}</div>
                        <div style={{ fontSize: 12.5, color: "#4b5563", marginTop: 3 }}>
                          🕐 {punkt.startzeit}–{punkt.endzeit} Uhr · {formatStunden(punkt.stunden)}
                        </div>
                        {punkt.kundenAdresse && (
                          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                            📍 {punkt.kundenAdresse}
                          </div>
                        )}
                        {punkt.kundenTelefon && (
                          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                            ☎️{" "}
                            <a href={`tel:${punkt.kundenTelefon}`} style={{ color: "#1d4ed8", textDecoration: "none" }}>
                              {punkt.kundenTelefon}
                            </a>
                          </div>
                        )}
                        {punkt.notizen && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#92400e",
                              background: "#fffbeb",
                              border: "1px solid #fde68a",
                              borderRadius: 8,
                              padding: "6px 9px",
                              marginTop: 6,
                            }}
                          >
                            💡 {punkt.notizen}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ ...etikett, background: "#e8f5e4", color: "#2d6a27" }}>§{punkt.paragraph}</span>
                          {punkt.paragraph2 && (
                            <span style={{ ...etikett, background: "#ede9fe", color: "#6d28d9" }}>
                              §{punkt.paragraph2}
                            </span>
                          )}
                          <span style={{ ...etikett, background: status.hintergrund, color: status.farbe }}>
                            {status.label}
                          </span>
                          {punkt.kundenAdresse && (
                            <a
                              href={navigationsLink(punkt.kundenAdresse)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                ...etikett,
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                textDecoration: "none",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              🗺️ Navigation starten
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Sortierung auch ohne Drag-and-Drop bedienbar */}
                      {darfSortieren && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => verschiebe(index, index - 1)}
                            disabled={index === 0}
                            title="Nach oben"
                            style={{ ...pfeilStil, opacity: index === 0 ? 0.3 : 1 }}
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => verschiebe(index, index + 1)}
                            disabled={index === punkte.length - 1}
                            title="Nach unten"
                            style={{ ...pfeilStil, opacity: index === punkte.length - 1 ? 0.3 : 1 }}
                          >
                            ▼
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Wochen- und Monatsansicht ─────────────────────────────────── */}
      {ansicht !== "tag" && (
        <div>
          {uebersichtLaedt ? (
            <div style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>Übersicht wird geladen …</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: ansicht === "monat" ? "repeat(7,1fr)" : "repeat(auto-fill,minmax(200px,1fr))",
                gap: 10,
              }}
            >
              {(() => {
                const tage: string[] = [];
                let aktuell = uebersicht?.von ?? zeitraumStart;
                const ende = uebersicht?.bis ?? zeitraumStart;
                while (aktuell <= ende) {
                  tage.push(aktuell);
                  aktuell = addTage(aktuell, 1);
                }
                return tage.map((tag) => {
                  const termine = ((uebersicht?.termine ?? []) as any[]).filter((t) => t.datum === tag);
                  const feiertag = getFeiertag(tag);
                  return (
                    <div
                      key={tag}
                      onClick={() => {
                        setDatum(tag);
                        setAnsicht("tag");
                        setUngespeichert(false);
                      }}
                      style={{
                        background: feiertag ? "#fff7ed" : "#fff",
                        borderRadius: 10,
                        padding: 10,
                        boxShadow: "0 2px 6px rgba(0,0,0,.05)",
                        border: tag === heute ? "2px solid #4a8c3f" : "1px solid #f0f0f0",
                        cursor: "pointer",
                        minHeight: 90,
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 800, marginBottom: 6, color: "#374151" }}>
                        {new Date(`${tag}T12:00:00`).getDate()}.{" "}
                        {WOCHENTAGE_LANG[(new Date(`${tag}T12:00:00`).getDay() + 6) % 7].slice(0, 2)}
                      </div>
                      {termine.length === 0 ? (
                        <div style={{ fontSize: 10.5, color: "#d1d5db" }}>–</div>
                      ) : (
                        termine.map((termin) => (
                          <div
                            key={termin.id}
                            style={{
                              fontSize: 10.5,
                              padding: "3px 5px",
                              borderRadius: 5,
                              background: "#f0fdf4",
                              borderLeft: `3px solid ${getMitarbeiterFarbe(termin.mitarbeiterId)}`,
                              marginBottom: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {termin.startzeit} {termin.kundenName}
                          </div>
                        ))
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stile ───────────────────────────────────────────────────────────────────

const navStil: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 700,
  color: "#4b5563",
};

const aktionStil: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const etikett: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  padding: "3px 7px",
  borderRadius: 20,
  whiteSpace: "nowrap",
};

const pfeilStil: React.CSSProperties = {
  width: 28,
  height: 24,
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: 10,
  color: "#4b5563",
};
