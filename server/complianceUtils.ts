export type ErsteHilfeKursStatus = "bestanden" | "angemeldet" | "abgelaufen";

export type ErsteHilfeKursInput = {
  status: ErsteHilfeKursStatus;
  kursDatum?: Date | string | null;
  ablaufDatum?: Date | string | null;
};

export type ErsteHilfeAmpel = "gruen" | "gelb" | "rot";

function asDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Bewertet den jüngsten gültigen Erste-Hilfe-Nachweis. Ein angemeldeter Kurs ist
 * sichtbar als gelber Vorwarnstatus, ersetzt aber keinen gültigen Nachweis.
 */
export function ermittleErsteHilfeStatus(
  kurse: ErsteHilfeKursInput[],
  heute: Date = new Date(),
): { ampel: ErsteHilfeAmpel; ablaufDatum: Date | null; letzterKurs: ErsteHilfeKursInput | null } {
  const sortiert = [...kurse].sort((a, b) => {
    const aZeit = asDate(a.kursDatum)?.getTime() ?? 0;
    const bZeit = asDate(b.kursDatum)?.getTime() ?? 0;
    return bZeit - aZeit;
  });
  const gueltige = sortiert.filter((kurs) => {
    if (kurs.status !== "bestanden") return false;
    const ablauf = asDate(kurs.ablaufDatum);
    return !ablauf || ablauf >= heute;
  });
  const letzterGueltiger = gueltige[0] ?? null;
  const ablaufDatum = asDate(letzterGueltiger?.ablaufDatum);
  if (letzterGueltiger) {
    if (!ablaufDatum) return { ampel: "gelb", ablaufDatum: null, letzterKurs: letzterGueltiger };
    const tageBisAblauf = Math.ceil((ablaufDatum.getTime() - heute.getTime()) / 86_400_000);
    return {
      ampel: tageBisAblauf > 60 ? "gruen" : "gelb",
      ablaufDatum,
      letzterKurs: letzterGueltiger,
    };
  }
  const angemeldet = sortiert.find((kurs) => kurs.status === "angemeldet") ?? null;
  return { ampel: angemeldet ? "gelb" : "rot", ablaufDatum: null, letzterKurs: angemeldet };
}
