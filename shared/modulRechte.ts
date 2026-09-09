/**
 * Zentraler Katalog der individuell steuerbaren Portalmodule.
 *
 * Die Seitenkennung muss mit NavigationContext und PortalApp übereinstimmen.
 * Der frühere Defekt: „Kundenbegleitungen“ hatte keinen steuerbaren Modulschlüssel
 * und konnte dadurch weder sauber freigegeben noch entzogen werden.
 */
export const MODUL_RECHTE = [
  { key: "einsaetze", label: "Einsätze einsehen" },
  { key: "einsaetze_erstellen", label: "Einsätze erstellen/bearbeiten" },
  { key: "leistungsnachweise", label: "Leistungsnachweise" },
  { key: "fahrten", label: "Fahrtennachweise" },
  { key: "privatrechnung", label: "Sonderfahrten" },
  { key: "kunden", label: "Kundenliste" },
  { key: "tourplanung", label: "Tourplanung" },
  { key: "buchhaltung", label: "Buchhaltung / Abschluss" },
  { key: "analysen", label: "Analysen & Berichte" },
  { key: "sicherheit", label: "Sicherheitsunterweisungen" },
  { key: "fuehrerschein", label: "Führerschein-Checks" },
  { key: "admin", label: "Admin-Bereich" },
  { key: "dsgvo", label: "DSGVO-Dokumente" },
] as const;

export type SteuerbaresModul = (typeof MODUL_RECHTE)[number]["key"];
export type Portalrolle = "mitarbeiter" | "teamleitung" | "buchhaltung" | "admin";

/**
 * Standardfreigaben. Nur hier aufgeführte Schlüssel werden explizit über die
 * Rechteverwaltung standardmäßig gesteuert; übrige bestehende Portalbereiche
 * behalten ihr bisheriges Standardverhalten, bis sie zentral ergänzt werden.
 */
export const ROLLEN_STANDARD: Record<Portalrolle, readonly SteuerbaresModul[]> = {
  mitarbeiter: ["privatrechnung"],
  teamleitung: ["privatrechnung"],
  buchhaltung: ["privatrechnung"],
  admin: ["privatrechnung"],
};

export function hatStandardModulrecht(rolle: string, modul: string): boolean {
  const standard = ROLLEN_STANDARD[rolle as Portalrolle];
  if (!standard) return true;
  return !MODUL_RECHTE.some((eintrag) => eintrag.key === modul) || standard.includes(modul as SteuerbaresModul);
}
