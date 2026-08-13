import { randomBytes } from "node:crypto";

/** Erzeugt ein nur einmal anzuzeigendes Startpasswort ohne Klartextspeicherung. */
export function generiereEinmaligesStartpasswort(): string {
  return `Lb!${randomBytes(12).toString("base64url")}`;
}

/** Filtert ausschließlich aktive Nicht-Admin-Mitarbeiter für die Passwort- und Kartenausgabe. */
export function waehleDruckbareMitarbeiter<T extends { id: number; aktiv: number | boolean; rolle: string }>(
  mitarbeiter: T[],
  mitarbeiterIds?: number[],
): T[] {
  const ausgewaehlteIds = mitarbeiterIds ? new Set(mitarbeiterIds) : null;
  return mitarbeiter.filter((ma) => Boolean(ma.aktiv) && ma.rolle !== "admin" && (!ausgewaehlteIds || ausgewaehlteIds.has(ma.id)));
}
