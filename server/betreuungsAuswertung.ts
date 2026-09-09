export const AUSWERTUNGS_PARAGRAPHEN = ["45b", "45a", "39"] as const;

export type AuswertungsParagraph = (typeof AUSWERTUNGS_PARAGRAPHEN)[number];

type EinsatzDaten = {
  id: number;
  mitarbeiterId: number;
  kundenId: number;
  status: string;
  paragraph: string;
  paragraph2?: string | null;
  dauerStunden?: unknown;
  stunden1?: unknown;
  stunden2?: unknown;
  kosten1?: unknown;
  kosten2?: unknown;
};

type BudgetDaten = {
  kundenId: number;
  leistungsbereich: string;
  jahresbudgetCent: number;
  verbrauchtCent: number;
  stundensatzCent: number;
};

type MitarbeiterDaten = {
  id: number;
  vorname: string;
  nachname: string;
};

function zahl(wert: unknown): number {
  const nummer = typeof wert === "number" ? wert : Number.parseFloat(String(wert ?? 0));
  return Number.isFinite(nummer) ? nummer : 0;
}

function runde(wert: number): number {
  return Math.round((wert + Number.EPSILON) * 100) / 100;
}

function istParagraph(wert: string | null | undefined): wert is AuswertungsParagraph {
  return AUSWERTUNGS_PARAGRAPHEN.includes(wert as AuswertungsParagraph);
}

/** Liefert die tatsächlich gespeicherten Anteile eines Einsatzes, ohne Gesamtstunden doppelt zu zählen. */
export function einsatzAnteile(einsatz: EinsatzDaten): Array<{ paragraph: AuswertungsParagraph; stunden: number; kosten: number }> {
  const stunden2 = Math.max(0, zahl(einsatz.stunden2));
  const gesamtstunden = Math.max(0, zahl(einsatz.dauerStunden));
  const stunden1 = Math.max(0, zahl(einsatz.stunden1 ?? Math.max(0, gesamtstunden - stunden2)));
  const anteile: Array<{ paragraph: AuswertungsParagraph; stunden: number; kosten: number }> = [];
  if (istParagraph(einsatz.paragraph) && stunden1 > 0) {
    anteile.push({ paragraph: einsatz.paragraph, stunden: stunden1, kosten: Math.max(0, zahl(einsatz.kosten1)) });
  }
  if (istParagraph(einsatz.paragraph2) && stunden2 > 0) {
    anteile.push({ paragraph: einsatz.paragraph2, stunden: stunden2, kosten: Math.max(0, zahl(einsatz.kosten2)) });
  }
  return anteile;
}

/**
 * Kundenprofil: Stunden und Budget werden pro Paragraph separat dargestellt.
 * Abgesagte Einsätze sind bewusst ausgeschlossen; abgeschlossene Stunden
 * bleiben als gesonderte, nachweisbare Teilmenge sichtbar.
 */
export function berechneKundenParagraphenAuswertung(einsaetze: EinsatzDaten[], budgets: BudgetDaten[]) {
  return AUSWERTUNGS_PARAGRAPHEN.map((paragraph) => {
    const relevanteEinsaetze = einsaetze.filter((einsatz) => einsatz.status !== "abgesagt");
    const anteile = relevanteEinsaetze.flatMap((einsatz) =>
      einsatzAnteile(einsatz)
        .filter((anteil) => anteil.paragraph === paragraph)
        .map((anteil) => ({ ...anteil, einsatzId: einsatz.id, status: einsatz.status })),
    );
    const passendeBudgets = budgets.filter((budget) => budget.leistungsbereich === paragraph);
    const jahresbudgetCent = passendeBudgets.reduce((summe, budget) => summe + zahl(budget.jahresbudgetCent), 0);
    const verbrauchtCent = passendeBudgets.reduce((summe, budget) => summe + zahl(budget.verbrauchtCent), 0);
    const stundenGeplant = anteile.reduce((summe, anteil) => summe + anteil.stunden, 0);
    const stundenAbgeschlossen = anteile
      .filter((anteil) => anteil.status === "abgeschlossen")
      .reduce((summe, anteil) => summe + anteil.stunden, 0);

    return {
      paragraph,
      einsaetze: new Set(anteile.map((anteil) => anteil.einsatzId)).size,
      stundenGeplant: runde(stundenGeplant),
      stundenAbgeschlossen: runde(stundenAbgeschlossen),
      hatJahresbudget: jahresbudgetCent > 0,
      jahresbudgetEuro: runde(jahresbudgetCent / 100),
      verbrauchtEuro: runde(verbrauchtCent / 100),
      restbudgetEuro: runde(Math.max(0, jahresbudgetCent - verbrauchtCent) / 100),
      budgetnutzungProzent: jahresbudgetCent > 0 ? Math.min(100, Math.round((verbrauchtCent / jahresbudgetCent) * 100)) : 0,
    };
  });
}

/**
 * Führungskräfteansicht: Transparente Betriebskennzahlen statt automatischer
 * Leistungsbewertung. Das offene Kundenbudget ist ein Planungshinweis und
 * keine individuelle Bewertung des Mitarbeiters.
 */
export function berechneMitarbeiterBetreuungskennzahlen(args: {
  mitarbeiter: MitarbeiterDaten[];
  einsaetze: EinsatzDaten[];
  budgets: BudgetDaten[];
}) {
  return args.mitarbeiter.map((person) => {
    const eigeneEinsaetze = args.einsaetze.filter(
      (einsatz) => einsatz.mitarbeiterId === person.id && einsatz.status !== "abgesagt",
    );
    const kundenIds = new Set(eigeneEinsaetze.map((einsatz) => einsatz.kundenId));
    const relevanteBudgets = args.budgets.filter((budget) => kundenIds.has(budget.kundenId));
    const jahresbudgetCent = relevanteBudgets.reduce((summe, budget) => summe + zahl(budget.jahresbudgetCent), 0);
    const verbrauchtCent = relevanteBudgets.reduce((summe, budget) => summe + zahl(budget.verbrauchtCent), 0);
    const anteile = eigeneEinsaetze.flatMap((einsatz) =>
      einsatzAnteile(einsatz).map((anteil) => ({ ...anteil, kundenId: einsatz.kundenId })),
    );
    const budgetwirkungCent = anteile.reduce((summe, anteil) => {
      if (anteil.kosten > 0) return summe + anteil.kosten * 100;
      const budget = relevanteBudgets.find(
        (eintrag) => eintrag.kundenId === anteil.kundenId && eintrag.leistungsbereich === anteil.paragraph,
      );
      return summe + anteil.stunden * (budget?.stundensatzCent ?? 0);
    }, 0);
    const abgeschlossen = eigeneEinsaetze.filter((einsatz) => einsatz.status === "abgeschlossen");
    const gesamtstunden = eigeneEinsaetze.reduce((summe, einsatz) => summe + zahl(einsatz.dauerStunden), 0);
    const abgeschlosseneStunden = abgeschlossen.reduce((summe, einsatz) => summe + zahl(einsatz.dauerStunden), 0);

    return {
      mitarbeiterId: person.id,
      name: `${person.vorname} ${person.nachname}`.trim(),
      kundenAnzahl: kundenIds.size,
      einsaetzeGeplant: eigeneEinsaetze.length,
      einsaetzeAbgeschlossen: abgeschlossen.length,
      abschlussquoteProzent: eigeneEinsaetze.length > 0 ? Math.round((abgeschlossen.length / eigeneEinsaetze.length) * 100) : 0,
      betreuungsstunden: runde(gesamtstunden),
      betreuungsstundenAbgeschlossen: runde(abgeschlosseneStunden),
      kundenMitAktivemBudget: new Set(relevanteBudgets.map((budget) => budget.kundenId)).size,
      budgetwirkungEuro: runde(budgetwirkungCent / 100),
      budgetGesamtEuro: runde(jahresbudgetCent / 100),
      budgetRestEuro: runde(Math.max(0, jahresbudgetCent - verbrauchtCent) / 100),
      budgetnutzungDerBetreutenKundenProzent:
        jahresbudgetCent > 0 ? Math.min(100, Math.round((verbrauchtCent / jahresbudgetCent) * 100)) : 0,
    };
  });
}
