/**
 * Erstellt den QR-Ziel-Link einer Zugangskarte.
 * Bewusst enthalten sind nur Portaladresse und E-Mail – niemals ein Passwort oder Token.
 */
export function erstelleZugangskartenQrZiel(email: string): string {
  const normalisierteEmail = email.trim().toLowerCase();
  if (!normalisierteEmail) throw new Error("E-Mail für Zugangskarten-QR-Code fehlt.");
  return `https://portal.lebenswert-betreuung.de/?email=${encodeURIComponent(normalisierteEmail)}`;
}
