/** Fachregeln für den vereinfachten Mitarbeiterablauf. */
export function liegtImPlanungsfenster(datum: string, heute: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !/^\d{4}-\d{2}-\d{2}$/.test(heute)) return false;
  const ende = new Date(`${heute}T12:00:00`);
  ende.setDate(ende.getDate() + 13);
  const endeText = `${ende.getFullYear()}-${String(ende.getMonth() + 1).padStart(2, "0")}-${String(ende.getDate()).padStart(2, "0")}`;
  return datum >= heute && datum <= endeText;
}

export function berechneBesuchsdauerMinuten(startIso?: string, endeIso?: string, fallbackStunden = 0): number {
  if (startIso && endeIso) {
    const start = new Date(startIso);
    const ende = new Date(endeIso);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(ende.getTime()) && ende > start) {
      return Math.round((ende.getTime() - start.getTime()) / 60_000);
    }
  }
  return Math.max(0, Math.round(fallbackStunden * 60));
}

export function bereiteEinsatzUebernahmeVor(input: {
  einsatzDatum: string | Date;
  tatsaechlicherStart?: string;
  tatsaechlichesEnde?: string;
  geplanteStunden?: number;
}) {
  const datum = input.einsatzDatum instanceof Date
    ? input.einsatzDatum.toISOString().slice(0, 10)
    : String(input.einsatzDatum).slice(0, 10);
  return {
    datum,
    monat: datum.slice(0, 7),
    dauerMinuten: berechneBesuchsdauerMinuten(
      input.tatsaechlicherStart,
      input.tatsaechlichesEnde,
      input.geplanteStunden ?? 0,
    ),
  };
}
