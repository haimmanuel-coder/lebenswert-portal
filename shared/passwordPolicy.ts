export const PASSWORT_MINDESTLAENGE = 12;
export const STARTPASSWORT_GUELTIG_TAGE = 7;

export type PasswortPruefung = {
  mindestlaenge: boolean;
  grossbuchstabe: boolean;
  kleinbuchstabe: boolean;
  ziffer: boolean;
  sonderzeichen: boolean;
  gueltig: boolean;
};

export function pruefeSicheresPasswort(passwort: string): PasswortPruefung {
  const mindestlaenge = passwort.length >= PASSWORT_MINDESTLAENGE;
  const grossbuchstabe = /[A-ZÄÖÜ]/.test(passwort);
  const kleinbuchstabe = /[a-zäöüß]/.test(passwort);
  const ziffer = /\d/.test(passwort);
  const sonderzeichen = /[^A-Za-zÄÖÜäöüß0-9]/.test(passwort);
  return { mindestlaenge, grossbuchstabe, kleinbuchstabe, ziffer, sonderzeichen, gueltig: mindestlaenge && grossbuchstabe && kleinbuchstabe && ziffer && sonderzeichen };
}

export const SICHERES_PASSWORT_HINWEIS = "Mindestens 12 Zeichen sowie Groß- und Kleinbuchstaben, eine Zahl und ein Sonderzeichen.";

export function bewertePasswortStaerke(passwort: string): { punkte: number; label: string; farbe: string } {
  const pruefung = pruefeSicheresPasswort(passwort);
  const punkte = [pruefung.mindestlaenge, pruefung.grossbuchstabe, pruefung.kleinbuchstabe, pruefung.ziffer, pruefung.sonderzeichen].filter(Boolean).length;
  if (punkte <= 1) return { punkte, label: "Sehr schwach", farbe: "#dc2626" };
  if (punkte === 2) return { punkte, label: "Schwach", farbe: "#ea580c" };
  if (punkte === 3) return { punkte, label: "Mittel", farbe: "#ca8a04" };
  if (punkte === 4) return { punkte, label: "Stark", farbe: "#15803d" };
  return { punkte, label: "Sehr stark", farbe: "#166534" };
}

export function startPasswortLaeuftAb(erstelltAm: Date | string | null | undefined, heute = new Date()): boolean {
  if (!erstelltAm) return false;
  const datum = new Date(erstelltAm);
  if (Number.isNaN(datum.getTime())) return false;
  datum.setDate(datum.getDate() + STARTPASSWORT_GUELTIG_TAGE);
  return heute.getTime() >= datum.getTime();
}

export function startPasswortGueltigBis(erstelltAm: Date | string | null | undefined): Date | null {
  if (!erstelltAm) return null;
  const datum = new Date(erstelltAm);
  if (Number.isNaN(datum.getTime())) return null;
  datum.setDate(datum.getDate() + STARTPASSWORT_GUELTIG_TAGE);
  return datum;
}
