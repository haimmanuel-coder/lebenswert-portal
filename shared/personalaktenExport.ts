export type PersonalaktenStammdaten = Record<string, unknown> & { id: number };
export type PersonalaktenArbeitsmuster = Record<string, unknown> & { mitarbeiterId: number };
export type PersonalaktenUrlaub = Record<string, unknown> & { mitarbeiterId: number };

function datum(wert: unknown): string {
  if (!wert) return "";
  return typeof wert === "string" ? wert.slice(0, 10) : new Date(wert as Date).toISOString().slice(0, 10);
}

function zelle(wert: unknown): string {
  return `"${String(wert ?? "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
}

function name(ma: Record<string, unknown> | undefined): string {
  return ma ? `${ma.vorname ?? ""} ${ma.nachname ?? ""}`.trim() : "";
}

export function erstellePersonalaktenHistorienCsv(args: {
  mitarbeiter: PersonalaktenStammdaten[];
  arbeitsmuster: PersonalaktenArbeitsmuster[];
  urlaube: PersonalaktenUrlaub[];
  stichtag?: string;
}) {
  const mitarbeiterNachId = new Map(args.mitarbeiter.map((ma) => [Number(ma.id), ma]));
  const zeilen: string[] = ["Datensatztyp;Mitarbeiter-ID;Mitarbeiter;E-Mail;Status;Beschäftigung;Eintritt;Jahresurlaub;Gebucht;Arbeitstage;Gültig ab;Gültig bis;Urlaub von;Urlaub bis;Urlaubstage;Urlaubsstatus;Notiz;Adminnotiz;Erstellt am;Aktualisiert am"];
  for (const ma of args.mitarbeiter) {
    zeilen.push(["Stammdaten", ma.id, name(ma), ma.email, Number(ma.aktiv) ? "Aktiv" : "Inaktiv", ma.beschaeftigungsart, datum(ma.eintrittsdatum), ma.urlaubstageJahr, ma.urlaubstageVerbraucht, ma.arbeitstageWoche, "", "", "", "", "", "", "", "", "", ""].map(zelle).join(";"));
  }
  for (const muster of args.arbeitsmuster) {
    const ma = mitarbeiterNachId.get(Number(muster.mitarbeiterId));
    zeilen.push(["Arbeitsmuster", muster.mitarbeiterId, name(ma), ma?.email ?? "", ma && Number(ma.aktiv) ? "Aktiv" : "", ma?.beschaeftigungsart ?? "", ma ? datum(ma.eintrittsdatum) : "", ma?.urlaubstageJahr ?? "", ma?.urlaubstageVerbraucht ?? "", muster.arbeitstageWoche, datum(muster.gueltigAb), datum(muster.gueltigBis), "", "", "", "", "", "", datum(muster.createdAt), ""].map(zelle).join(";"));
  }
  for (const urlaub of args.urlaube) {
    const ma = mitarbeiterNachId.get(Number(urlaub.mitarbeiterId));
    zeilen.push(["Urlaub", urlaub.mitarbeiterId, name(ma), ma?.email ?? "", ma && Number(ma.aktiv) ? "Aktiv" : "", ma?.beschaeftigungsart ?? "", ma ? datum(ma.eintrittsdatum) : "", ma?.urlaubstageJahr ?? "", ma?.urlaubstageVerbraucht ?? "", ma?.arbeitstageWoche ?? "", "", "", datum(urlaub.von), datum(urlaub.bis), urlaub.tage, urlaub.status, urlaub.notizen, urlaub.adminNotiz, datum(urlaub.createdAt), datum(urlaub.updatedAt)].map(zelle).join(";"));
  }
  const stichtag = args.stichtag ?? new Date().toISOString().slice(0, 10);
  return {
    csv: `\uFEFF${zeilen.join("\n")}`,
    dateiName: `personalakte_arbeitsmuster_urlaub_${stichtag}.csv`,
    zeilen: zeilen.length - 1,
  };
}
