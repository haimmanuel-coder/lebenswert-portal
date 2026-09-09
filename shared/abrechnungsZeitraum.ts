export type Abrechnungszeitraum = {
  von: string;
  bis: string;
  label: string;
};

function datumText(jahr: number, monat: number, tag: number): string {
  return `${jahr}-${String(monat + 1).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/**
 * Einheitlicher Abrechnungszeitraum für Fahrten- und Minijob-Abrechnung.
 * Der Zeitraum beginnt am 16. und endet am 15. des Folgemonats.
 */
export function berechneAbrechnungszeitraum(referenz: Date | string = new Date()): Abrechnungszeitraum {
  const datum = typeof referenz === "string" ? new Date(`${referenz.slice(0, 10)}T12:00:00`) : referenz;
  const tag = datum.getDate();
  const monat = datum.getMonth();
  const jahr = datum.getFullYear();
  const startMonat = tag >= 16 ? monat : (monat + 11) % 12;
  const startJahr = tag >= 16 || monat > 0 ? jahr : jahr - 1;
  const endeMonat = (startMonat + 1) % 12;
  const endeJahr = startMonat === 11 ? startJahr + 1 : startJahr;
  const monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const von = datumText(startJahr, startMonat, 16);
  const bis = datumText(endeJahr, endeMonat, 15);
  return { von, bis, label: `16.${monate[startMonat]} ${startJahr} – 15.${monate[endeMonat]} ${endeJahr}` };
}
