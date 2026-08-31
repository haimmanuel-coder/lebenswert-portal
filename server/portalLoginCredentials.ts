import bcrypt from "bcryptjs";

/**
 * Kapselt den Passwortvergleich der Mitarbeiteranmeldung. Die Oberfläche
 * erhält weiterhin nur die neutrale Fehlermeldung, unabhängig davon, ob die
 * E-Mail-Adresse, das Konto oder das Passwort nicht passt.
 */
export async function istPortalPasswortGueltig(passwort: string, passwortHash: string): Promise<boolean> {
  return bcrypt.compare(passwort, passwortHash);
}
