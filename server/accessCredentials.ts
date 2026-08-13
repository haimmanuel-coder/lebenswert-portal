import { randomBytes } from "node:crypto";

/** Erzeugt ein nur einmal anzuzeigendes Startpasswort ohne Klartextspeicherung. */
export function generiereEinmaligesStartpasswort(): string {
  return `Lb!${randomBytes(12).toString("base64url")}`;
}
