/**
 * ════════════════════════════════════════════════════════════════════════════
 *  AUSWAHLFELD – Combobox mit Suche
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Wiederverwendbares Auswahlfeld für Kunden, Mitarbeiter und Kostenträger.
 *
 * Warum eine eigene Komponente statt des Radix-`Select`?
 *   Das bisherige Auswahlmenü war in scrollbaren Sheets und Dialogen nicht
 *   zuverlässig bedienbar: Das portalierte Menü wurde beim Scrollen des
 *   Sheets geschlossen, und bei vielen Einträgen fehlte jede Suchmöglichkeit.
 *   Diese Komponente rendert die Liste direkt im Dokumentfluss des Feldes,
 *   funktioniert dadurch in jedem Container und bietet immer eine Suche.
 *
 * Eigenschaften:
 *   • Tastaturbedienung (↑ ↓ Enter Esc)
 *   • Volltextsuche über alle Suchbegriffe eines Eintrags
 *   • Leere oder unvollständige Einträge werden herausgefiltert
 *   • Auswahl wird als stabile ID zurückgegeben (nie ein leerer String)
 *   • Schließt bei Klick außerhalb und gibt den Wert zuverlässig weiter
 */

import { useEffect, useMemo, useRef, useState } from "react";

export type AuswahlOption = {
  /** Eindeutige ID des Eintrags */
  id: number;
  /** Anzeigetext, z. B. "Müller, Anna" */
  label: string;
  /** Zusatzinformation, z. B. "PG 3 · §45b" */
  hinweis?: string;
  /** Farbiger Punkt links (z. B. Mitarbeiterfarbe) */
  farbe?: string;
  /** Zusätzliche Begriffe, über die gesucht werden kann */
  suchbegriffe?: string[];
};

type Props = {
  optionen: AuswahlOption[];
  wert: number | null;
  onChange: (id: number | null) => void;
  platzhalter?: string;
  suchPlatzhalter?: string;
  /** Feld als Pflichtfeld markieren (rote Umrandung bei leerem Wert) */
  pflicht?: boolean;
  /** Ladezustand der Datenquelle */
  laedt?: boolean;
  deaktiviert?: boolean;
  /** Zeigt einen Eintrag "Keine Auswahl" an */
  loeschbar?: boolean;
  /** Fehlermeldung unterhalb des Feldes */
  fehler?: string | null;
  testId?: string;
};

/** Normalisiert Text für die Suche (Kleinschreibung, Umlaute vereinheitlicht). */
function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

export default function AuswahlFeld({
  optionen,
  wert,
  onChange,
  platzhalter = "Bitte auswählen …",
  suchPlatzhalter = "Suchen …",
  pflicht = false,
  laedt = false,
  deaktiviert = false,
  loeschbar = false,
  fehler = null,
  testId,
}: Props) {
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState("");
  const [markiert, setMarkiert] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sucheRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  /**
   * Unvollständige Einträge herausfiltern: Ein Eintrag ohne gültige ID oder
   * ohne Beschriftung würde als leere, nicht auswählbare Zeile erscheinen.
   */
  const gueltigeOptionen = useMemo(
    () =>
      (optionen ?? []).filter(
        (o) => o && Number.isFinite(o.id) && o.id > 0 && typeof o.label === "string" && o.label.trim().length > 0,
      ),
    [optionen],
  );

  const gefiltert = useMemo(() => {
    const begriff = normalisiere(suche);
    if (!begriff) return gueltigeOptionen;
    return gueltigeOptionen.filter((o) => {
      const heuhaufen = normalisiere(
        [o.label, o.hinweis ?? "", ...(o.suchbegriffe ?? [])].join(" "),
      );
      // Alle Teilbegriffe müssen vorkommen – erlaubt "mueller anna"
      return begriff.split(/\s+/).every((teil) => heuhaufen.includes(teil));
    });
  }, [gueltigeOptionen, suche]);

  const ausgewaehlt = useMemo(
    () => gueltigeOptionen.find((o) => o.id === wert) ?? null,
    [gueltigeOptionen, wert],
  );

  // Klick außerhalb schließt das Menü
  useEffect(() => {
    if (!offen) return;
    const handler = (ereignis: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ereignis.target as Node)) {
        setOffen(false);
        setSuche("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [offen]);

  // Beim Öffnen den Fokus in das Suchfeld setzen
  useEffect(() => {
    if (offen) {
      setMarkiert(0);
      window.setTimeout(() => sucheRef.current?.focus(), 0);
    }
  }, [offen]);

  // Markierten Eintrag in den sichtbaren Bereich scrollen
  useEffect(() => {
    if (!offen || !listeRef.current) return;
    const element = listeRef.current.querySelector<HTMLElement>(`[data-index="${markiert}"]`);
    element?.scrollIntoView({ block: "nearest" });
  }, [markiert, offen]);

  const waehle = (id: number | null) => {
    onChange(id);
    setOffen(false);
    setSuche("");
  };

  const beiTaste = (ereignis: React.KeyboardEvent) => {
    if (ereignis.key === "ArrowDown") {
      ereignis.preventDefault();
      setMarkiert((m) => Math.min(m + 1, gefiltert.length - 1));
    } else if (ereignis.key === "ArrowUp") {
      ereignis.preventDefault();
      setMarkiert((m) => Math.max(m - 1, 0));
    } else if (ereignis.key === "Enter") {
      ereignis.preventDefault();
      const treffer = gefiltert[markiert];
      if (treffer) waehle(treffer.id);
    } else if (ereignis.key === "Escape") {
      ereignis.preventDefault();
      setOffen(false);
      setSuche("");
    }
  };

  const fehlerhaft = Boolean(fehler) || (pflicht && !ausgewaehlt);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }} data-testid={testId}>
      {/* Auslöser */}
      <button
        type="button"
        disabled={deaktiviert || laedt}
        onClick={() => setOffen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          border: `2px solid ${fehlerhaft ? "#fca5a5" : offen ? "#4a8c3f" : "#e5e7eb"}`,
          borderRadius: 10,
          background: deaktiviert ? "#f9fafb" : "#fff",
          fontSize: 14,
          textAlign: "left",
          cursor: deaktiviert || laedt ? "not-allowed" : "pointer",
          color: ausgewaehlt ? "#111827" : "#9ca3af",
          boxSizing: "border-box",
        }}
      >
        {ausgewaehlt?.farbe && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: ausgewaehlt.farbe,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: ausgewaehlt ? 600 : 400,
          }}
        >
          {laedt ? "Daten werden geladen …" : (ausgewaehlt?.label ?? platzhalter)}
        </span>
        {ausgewaehlt?.hinweis && (
          <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>{ausgewaehlt.hinweis}</span>
        )}
        <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{offen ? "▲" : "▼"}</span>
      </button>

      {fehler && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{fehler}</div>}

      {/* Auswahlliste */}
      {offen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 60,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}
        >
          {/* Suchfeld */}
          <div style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
            <input
              ref={sucheRef}
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value);
                setMarkiert(0);
              }}
              onKeyDown={beiTaste}
              placeholder={suchPlatzhalter}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div ref={listeRef} style={{ maxHeight: 260, overflowY: "auto" }}>
            {loeschbar && !suche && (
              <button
                type="button"
                onClick={() => waehle(null)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#6b7280",
                  cursor: "pointer",
                  fontStyle: "italic",
                }}
              >
                Keine Auswahl
              </button>
            )}

            {gefiltert.length === 0 ? (
              <div style={{ padding: "16px 12px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                {gueltigeOptionen.length === 0
                  ? "Keine Einträge vorhanden."
                  : `Kein Treffer für „${suche}“.`}
              </div>
            ) : (
              gefiltert.map((option, index) => {
                const istAusgewaehlt = option.id === wert;
                const istMarkiert = index === markiert;
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setMarkiert(index)}
                    onClick={() => waehle(option.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      border: "none",
                      background: istMarkiert ? "#f0fdf4" : "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      borderLeft: istAusgewaehlt ? "3px solid #4a8c3f" : "3px solid transparent",
                    }}
                  >
                    {option.farbe && (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: option.farbe,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13.5,
                        fontWeight: istAusgewaehlt ? 700 : 500,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {option.label}
                    </span>
                    {option.hinweis && (
                      <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>{option.hinweis}</span>
                    )}
                    {istAusgewaehlt && <span style={{ color: "#4a8c3f", fontSize: 12 }}>✓</span>}
                  </button>
                );
              })
            )}
          </div>

          {gueltigeOptionen.length > 0 && (
            <div
              style={{
                padding: "6px 12px",
                borderTop: "1px solid #f3f4f6",
                fontSize: 10.5,
                color: "#9ca3af",
                background: "#fafafa",
              }}
            >
              {gefiltert.length} von {gueltigeOptionen.length} Einträgen
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Baut Auswahloptionen aus einer Kundenliste. */
export function kundenZuOptionen(
  kunden: Array<Record<string, any>> | undefined | null,
): AuswahlOption[] {
  return (kunden ?? [])
    .filter((k) => k && k.id && (k.vorname || k.nachname))
    .map((k) => {
      const hinweise: string[] = [];
      if (k.pflegegrad) hinweise.push(`PG ${k.pflegegrad}`);
      if (k.paragraph) hinweise.push(`§${k.paragraph}`);
      return {
        id: Number(k.id),
        label: `${k.nachname ?? ""}, ${k.vorname ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim(),
        hinweis: hinweise.join(" · ") || undefined,
        suchbegriffe: [
          k.vorname ?? "",
          k.nachname ?? "",
          k.ort ?? "",
          k.versicherungsnummer ?? "",
          k.telefon ?? "",
        ].filter(Boolean),
      };
    });
}

/** Baut Auswahloptionen aus einer Mitarbeiterliste. */
export function mitarbeiterZuOptionen(
  personen: Array<Record<string, any>> | undefined | null,
  farbe?: (id: number) => string,
): AuswahlOption[] {
  return (personen ?? [])
    .filter((m) => m && m.id && (m.vorname || m.nachname))
    .filter((m) => m.aktiv === undefined || m.aktiv === 1 || m.aktiv === true)
    .map((m) => ({
      id: Number(m.id),
      label: `${m.nachname ?? ""}, ${m.vorname ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim(),
      hinweis: m.beschaeftigungsart ?? undefined,
      farbe: farbe ? farbe(Number(m.id)) : undefined,
      suchbegriffe: [m.vorname ?? "", m.nachname ?? "", m.email ?? "", m.position ?? ""].filter(Boolean),
    }));
}

/** Baut Auswahloptionen aus einer Kostenträgerliste. */
export function kostentraegerZuOptionen(
  traeger: Array<Record<string, any>> | undefined | null,
): AuswahlOption[] {
  return (traeger ?? [])
    .filter((k) => k && k.id && k.name)
    .filter((k) => k.aktiv === undefined || k.aktiv === 1 || k.aktiv === true)
    .map((k) => ({
      id: Number(k.id),
      label: String(k.name),
      hinweis: k.ikNummer ? `IK ${k.ikNummer}` : undefined,
      suchbegriffe: [k.name ?? "", k.ikNummer ?? "", k.ort ?? "", k.typ ?? ""].filter(Boolean),
    }));
}
