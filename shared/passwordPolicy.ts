export const PASSWORT_MINDESTLAENGE = 12;

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
