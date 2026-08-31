import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { istPortalPasswortGueltig } from "./portalLoginCredentials";

describe("Portal-Login – Passwortvergleich", () => {
  it("akzeptiert nur das richtige Passwort eines aktiven Kontos", async () => {
    const passwortHash = await bcrypt.hash("Sicheres!Testpasswort9", 4);

    await expect(istPortalPasswortGueltig("Sicheres!Testpasswort9", passwortHash)).resolves.toBe(true);
    await expect(istPortalPasswortGueltig("Sicheres!Testpasswort8", passwortHash)).resolves.toBe(false);
  });
});
