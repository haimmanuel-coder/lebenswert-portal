export function istAbgeschlossenerStartzugang(passwortWechselErforderlich: boolean, startPasswortErstelltAt: Date | string | null | undefined) {
  return Boolean(passwortWechselErforderlich && startPasswortErstelltAt);
}
