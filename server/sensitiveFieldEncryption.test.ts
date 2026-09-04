import { describe, expect, it } from "vitest";
import { entschluessleKundenGesundheitsdaten, entschluessleMitarbeiterStammdaten, entschluessleSensiblesFeld, verschluessleKundenGesundheitsdaten, verschluessleMitarbeiterStammdaten, verschluessleSensiblesFeld } from "./sensitiveFieldEncryption";

describe("Verschlüsselung sensibler Mitarbeiterstammdaten", () => {
  it("verschlüsselt und entschlüsselt einzelne Werte verlustfrei", () => {
    const klartext = "DE89370400440532013000";
    const verschluesselt = verschluessleSensiblesFeld(klartext);
    expect(verschluesselt).toMatch(/^enc:v1:/);
    expect(verschluesselt).not.toContain(klartext);
    expect(entschluessleSensiblesFeld(verschluesselt)).toBe(klartext);
  });

  it("hält alte Klartextwerte lesbar und verschlüsselt nur die vorgesehenen Felder", () => {
    const daten = { iban: "DE44500105175407324931", steueridentnummer: "12345678901", sozialversicherungsnummer: "12 123456 A 123", name: "Unverändert" };
    const verschluesselt = verschluessleMitarbeiterStammdaten(daten);
    expect(verschluesselt.iban).toMatch(/^enc:v1:/);
    expect(verschluesselt.name).toBe("Unverändert");
    expect(entschluessleMitarbeiterStammdaten(verschluesselt)).toEqual(daten);
  });

  it("verschlüsselt Krankenversicherungsart und Krankenkasse und stellt sie für berechtigte Serveraufrufe wieder her", () => {
    const gespeichert = verschluessleMitarbeiterStammdaten({ krankenversicherungsart: "gesetzlich", krankenkasse: "Musterkasse" });
    expect(gespeichert.krankenversicherungsart).toBeNull();
    expect(gespeichert.krankenversicherungsartVerschluesselt).toMatch(/^enc:v1:/);
    expect(gespeichert.krankenkasse).toBeNull();
    expect(gespeichert.krankenkasseVerschluesselt).toMatch(/^enc:v1:/);
    const gelesen = entschluessleMitarbeiterStammdaten(gespeichert);
    expect(gelesen.krankenversicherungsart).toBe("gesetzlich");
    expect(gelesen.krankenkasse).toBe("Musterkasse");
    expect(gelesen).not.toHaveProperty("krankenversicherungsartVerschluesselt");
    expect(gelesen).not.toHaveProperty("krankenkasseVerschluesselt");
  });

  it("verschlüsselt Pflegegrad und Pflegegradzeitraum, ohne sie für berechtigte Serveraufrufe zu verlieren", () => {
    const gespeichert = verschluessleKundenGesundheitsdaten({ pflegegrad: 3, pflegegradSeit: "2026-01-01" });
    expect(gespeichert.pflegegrad).toBeNull();
    expect(gespeichert.pflegegradVerschluesselt).toMatch(/^enc:v1:/);
    const gelesen = entschluessleKundenGesundheitsdaten(gespeichert);
    expect(gelesen.pflegegrad).toBe(3);
    expect(gelesen.pflegegradSeit).toBe("2026-01-01");
  });

  it("entfernt beim bewussten Leeren auch die verschlüsselten Vorgängerwerte", () => {
    const vorher = verschluessleKundenGesundheitsdaten({ pflegegrad: 2, pflegegradSeit: "2025-12-01" });
    const geloescht = verschluessleKundenGesundheitsdaten({
      ...vorher,
      pflegegrad: null,
      pflegegradSeit: null,
    });
    expect(geloescht.pflegegradVerschluesselt).toBeNull();
    expect(geloescht.pflegegradSeitVerschluesselt).toBeNull();
  });
});
