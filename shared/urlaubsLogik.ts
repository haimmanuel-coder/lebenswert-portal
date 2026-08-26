import { getFeiertag, zuDatumsString, type Bundesland } from "./planungsLogik";

export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
export type Wochentag = (typeof WOCHENTAGE)[number];
export const GESETZLICHER_ANSPRUCH_5_TAGE = 20;

const STANDARD_MUSTER: Wochentag[] = ["Mo", "Di", "Mi", "Do", "Fr"];

/** Liest ein gespeichertes JSON-Muster robust; Altdaten erhalten ein sicheres Standardmuster. */
export function normalisiereArbeitstage(wert: unknown, fallback: readonly Wochentag[] = STANDARD_MUSTER): Wochentag[] {
  let roh: unknown = wert;
  if (typeof roh === "string") {
    const musterText = roh;
    try {
      roh = JSON.parse(musterText);
    } catch {
      roh = musterText.split(",");
    }
  }
  const gefunden = Array.isArray(roh)
    ? roh.map((tag) => String(tag).trim()).filter((tag): tag is Wochentag => (WOCHENTAGE as readonly string[]).includes(tag))
    : [];
  const eindeutig = Array.from(new Set(gefunden)).sort((a, b) => WOCHENTAGE.indexOf(a) - WOCHENTAGE.indexOf(b));
  return eindeutig.length
    ? eindeutig
    : [...fallback];
}

/** Gesetzlicher Mindestanspruch aus der Verteilung der Arbeitszeit auf Arbeitstage. */
export function berechneGesetzlichenJahresurlaub(arbeitstage: readonly Wochentag[]): number {
  return (normalisiereArbeitstage(arbeitstage, []).length * GESETZLICHER_ANSPRUCH_5_TAGE) / 5;
}

/**
 * Berechnet den gesetzlichen Mindestanspruch zeitanteilig für einen
 * Kalendertagseintritt oder einen Wechsel des vertraglichen Wochenmusters.
 * Vertraglich günstigere Ansprüche werden außerhalb dieser Hilfsfunktion
 * unverändert erhalten.
 */
export function berechneZeitanteiligenJahresurlaub(args: {
  jahr: number;
  arbeitstageWoche: unknown;
  eintrittsdatum?: string | Date | null;
  arbeitsmusterHistorie?: ArbeitsmusterHistorie[];
}): number {
  const jahresStart = `${args.jahr}-01-01`;
  const jahresEnde = `${args.jahr}-12-31`;
  const eintritt = args.eintrittsdatum ? zuDatumsString(args.eintrittsdatum) : jahresStart;
  const start = eintritt > jahresStart ? eintritt : jahresStart;
  if (start > jahresEnde) return 0;
  const gesamtKalendertage = new Date(`${args.jahr + 1}-01-01T12:00:00`).getTime() - new Date(`${args.jahr}-01-01T12:00:00`).getTime();
  const cursor = new Date(`${start}T12:00:00`);
  const ende = new Date(`${jahresEnde}T12:00:00`);
  let anspruch = 0;
  while (cursor <= ende) {
    const datum = zuDatumsString(cursor);
    const eintrag = (args.arbeitsmusterHistorie ?? []).find((historie) => {
      const ab = zuDatumsString(historie.gueltigAb);
      const bis = historie.gueltigBis ? zuDatumsString(historie.gueltigBis) : "9999-12-31";
      return ab <= datum && datum <= bis;
    });
    const muster = normalisiereArbeitstage(eintrag?.arbeitstageWoche ?? args.arbeitstageWoche);
    anspruch += berechneGesetzlichenJahresurlaub(muster) / (gesamtKalendertage / 86400000);
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.round(anspruch * 2) / 2;
}

export function wochentagVonDatum(datum: string): Wochentag {
  const tag = new Date(`${datum}T12:00:00`).getDay();
  return WOCHENTAGE[(tag + 6) % 7];
}

export type Urlaubsverbrauch = {
  tage: number;
  arbeitstage: string[];
  ausgenommeneFeiertage: Array<{ datum: string; name: string }>;
};

export type ArbeitsmusterHistorie = {
  arbeitstageWoche: unknown;
  gueltigAb: string | Date;
  gueltigBis?: string | Date | null;
};

/**
 * Zählt nur vertraglich planmäßige Arbeitstage. Gesetzliche Feiertage werden
 * entsprechend der für dieses Portal festgelegten Abrechnungsregel nicht als
 * Urlaubstag verbraucht und werden nachvollziehbar zurückgegeben.
 */
export function berechneUrlaubsverbrauch(args: { von: string; bis: string; arbeitstageWoche: unknown; arbeitsmusterHistorie?: ArbeitsmusterHistorie[]; bundesland?: Bundesland | string }): Urlaubsverbrauch {
  const von = zuDatumsString(args.von);
  const bis = zuDatumsString(args.bis);
  if (!von || !bis || bis < von) return { tage: 0, arbeitstage: [], ausgenommeneFeiertage: [] };
  const muster = normalisiereArbeitstage(args.arbeitstageWoche);
  const arbeitstage: string[] = [];
  const ausgenommeneFeiertage: Array<{ datum: string; name: string }> = [];
  const cursor = new Date(`${von}T12:00:00`);
  const ende = new Date(`${bis}T12:00:00`);
  while (cursor <= ende) {
    const datum = zuDatumsString(cursor);
    const historischesMuster = (args.arbeitsmusterHistorie ?? []).find((eintrag) => {
      const ab = zuDatumsString(eintrag.gueltigAb);
      const bisHistorie = eintrag.gueltigBis ? zuDatumsString(eintrag.gueltigBis) : "9999-12-31";
      return ab <= datum && datum <= bisHistorie;
    });
    const tagesMuster = historischesMuster ? normalisiereArbeitstage(historischesMuster.arbeitstageWoche, muster) : muster;
    if (tagesMuster.includes(wochentagVonDatum(datum))) {
      const feiertag = getFeiertag(datum, args.bundesland);
      if (feiertag) ausgenommeneFeiertage.push({ datum, name: feiertag });
      else arbeitstage.push(datum);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { tage: arbeitstage.length, arbeitstage, ausgenommeneFeiertage };
}
