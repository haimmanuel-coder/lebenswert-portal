export function naechsterVerlauf<T extends string>(verlauf: T[], aktuelleSeite: T, zielSeite: T, limit = 20): T[] {
  if (aktuelleSeite === zielSeite || verlauf.at(-1) === aktuelleSeite) return verlauf;
  return [...verlauf, aktuelleSeite].slice(-limit);
}

export function vorherigeSeite<T extends string>(verlauf: T[]): { seite: T | null; verbleibenderVerlauf: T[] } {
  const seite = verlauf.at(-1) ?? null;
  return { seite, verbleibenderVerlauf: seite ? verlauf.slice(0, -1) : verlauf };
}
