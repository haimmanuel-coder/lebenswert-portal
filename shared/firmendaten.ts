/**
 * Firmendaten aus dem offiziellen Briefpapier.
 * Hinweis: Im Briefpapier steht "Seniorenassistenz Bernhardt",
 * aber der Betrieb firmiert als "Lebenswert Betreuung".
 * IK-Nummer und Anschrift bleiben identisch.
 */
export const FIRMENDATEN = {
  name: "Lebenswert Betreuung",
  inhaberin: "Bernhardt",
  ikNummer: "460 547 168",
  strasse: "Am Hedtberg 16",
  plz: "42389",
  ort: "Wuppertal",
  telefon: "0177 - 78 51 363",
  email: "assistenz-bernhardt@web.de",
  website: "www.seniorenassistenz-bernhardt.de",
  /** Abtretungshinweis für Leistungsnachweise */
  abtretungsHinweis: "Forderungsabtretung an Optadata GmbH gemäß separater Vereinbarung.",
  /** Briefpapier-PDF als Hintergrund für offizielle Dokumente (S3-Pfad) */
  briefpapierUrl: "/manus-storage/briefpapier_5b65c132.pdf",
} as const;
