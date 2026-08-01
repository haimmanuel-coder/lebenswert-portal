/**
 * ════════════════════════════════════════════════════════════════════════════
 *  tRPC-ROUTER: EINSATZPLANUNG
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Stellt der Teamleitung eine vollständig transparente Einsatzplanung bereit:
 * Personaleinsatz, Budget, Paragraphen, Lohnkosten, Touren, Urlaub und
 * Warnungen werden in einem Zug berücksichtigt.
 *
 * ── Berechtigungen ─────────────────────────────────────────────────────────
 *   Mitarbeiter   → sieht ausschließlich die eigene Planung, plant nicht
 *   Teamleitung   → plant alle Mitarbeiter, bestätigt Warnungen
 *   Buchhaltung   → liest die Planung (Kostenwirkung), plant nicht
 *   Admin         → alle Rechte, inklusive Löschen und Budget-Übersteuerung
 *
 * ── Validierungen beim Speichern ───────────────────────────────────────────
 *   1. Pflichtfelder (Mitarbeiter, Kunde, Datum, Zeiten, Paragraph)
 *   2. Endzeit nach Startzeit, Mindestbetreuungszeit 1,5 h
 *   3. Doppelbuchung Mitarbeiter und Kunde
 *   4. Genehmigter Urlaub / Krankmeldung des Mitarbeiters
 *   5. Budgetdeckung je Paragraph inklusive Anfahrtspauschale
 *   6. Minijob-Grenze (603 €/Monat) des Mitarbeiters
 *   7. Einsatz außerhalb der regulären Arbeitszeit
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "./_core/trpc";
import { portalProtected, roleProcedure } from "./portalAuth";
import {
  createAuditLog,
  createNotification,
  getAllMitarbeiter,
  getKundeById,
  getMitarbeiterById,
} from "./db";
import {
  aktualisierePlanungsEinsatz,
  bestaetigeWarnung,
  bucheBudget,
  erstellePlanungsEinsatz,
  getAblaufendeDokumente,
  getAbwesenheitAmTag,
  getAbwesenheitenImZeitraum,
  getEinsaetzeImZeitraum,
  getEinsatzById,
  getMonatsLohnkosten,
  getMonatsLohnkostenAlle,
  getSatzKonfiguration,
  getTourenImZeitraum,
  getWarnungen,
  loeschePlanungsEinsatz,
  loescheBestaetigteWarnungen,
  loescheTour,
  loescheWarnung,
  meldeWarnung,
  setzeEinsatzStatus,
  setzeParagraphSatz,
  softDelete,
  softDeleteRaw,
  speichereTourReihenfolge,
  storniereEinsatzBudget,
  type LoeschBereich,
  type PlanungsEinsatz,
} from "./planungDb";
import {
  ANFAHRT_PAUSCHALE,
  MINIJOB_GRENZE,
  addTage,
  berechneAlleBudgetLagen,
  berechneBudgetVorschau,
  berechneEinsatzKosten,
  berechneStunden,
  formatEuro,
  formatStunden,
  hatBlockierendeMeldung,
  monatsSchluessel,
  montagDerWoche,
  pruefeMinijobGrenze,
  runde2,
  validierePlanungsEingabe,
  verteileStunden,
  zeitenUeberschneidenSich,
  zuDatumsString,
  type Paragraph,
  type PlanungsMeldung,
} from "@shared/planungsLogik";

// ── Rollen-Prozeduren ───────────────────────────────────────────────────────

/** Wer die Planung verändern darf. */
const planungSchreiben = roleProcedure(["admin", "teamleitung"]);
/** Wer die Planung mindestens lesen darf (alle angemeldeten Rollen). */
const planungLesen = portalProtected;

/** Prüft, ob eine Rolle die gesamte Planung sehen darf. */
function darfAllesSehen(rolle: string): boolean {
  return rolle === "admin" || rolle === "teamleitung" || rolle === "buchhaltung";
}

// ── Eingabeschemata ─────────────────────────────────────────────────────────

const paragraphSchema = z.enum(["45b", "45a", "39"]);
const datumSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format JJJJ-MM-TT vorliegen.");
const zeitSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Uhrzeit muss im Format HH:MM vorliegen.");

const terminEingabeSchema = z.object({
  mitarbeiterId: z.number().int().positive(),
  kundenId: z.number().int().positive(),
  datum: datumSchema,
  startzeit: zeitSchema,
  endzeit: zeitSchema,
  paragraph: paragraphSchema,
  paragraph2: paragraphSchema.nullish(),
  stunden2: z.number().min(0).max(24).nullish(),
  notizen: z.string().max(2000).nullish(),
  /** Admin darf Budget- und Minijob-Sperren bewusst übersteuern. */
  uebersteuern: z.boolean().optional(),
});

type TerminEingabe = z.infer<typeof terminEingabeSchema>;

// ── Gemeinsame Prüf- und Berechnungslogik ──────────────────────────────────

/** Vollständiges Prüfergebnis eines geplanten Termins. */
type PruefErgebnis = {
  meldungen: PlanungsMeldung[];
  stunden: number;
  kosten: ReturnType<typeof berechneEinsatzKosten> | null;
  budgetVorschau: ReturnType<typeof berechneBudgetVorschau>[];
  minijob: ReturnType<typeof pruefeMinijobGrenze> | null;
  speicherbar: boolean;
};

/**
 * Führt alle Validierungen für einen geplanten Termin durch und berechnet
 * gleichzeitig Stunden, Kosten, Budgetvorschau und Minijob-Status.
 *
 * Dieselbe Funktion bedient die Live-Vorschau (`planung.pruefe`) und das
 * tatsächliche Speichern – so kann die Anzeige nie von der Prüfung abweichen.
 */
async function pruefeTermin(
  eingabe: TerminEingabe,
  optionen: { bearbeiteterEinsatzId?: number | null; istAdmin: boolean },
): Promise<PruefErgebnis> {
  const konfiguration = await getSatzKonfiguration();

  // 1. Formale Prüfung (identisch mit der Frontend-Vorschau)
  const meldungen: PlanungsMeldung[] = validierePlanungsEingabe({
    mitarbeiterId: eingabe.mitarbeiterId,
    kundenId: eingabe.kundenId,
    datum: eingabe.datum,
    startzeit: eingabe.startzeit,
    endzeit: eingabe.endzeit,
    paragraph: eingabe.paragraph,
    paragraph2: eingabe.paragraph2 ?? null,
    stunden2: eingabe.stunden2 ?? null,
  });

  const stunden = berechneStunden(eingabe.startzeit, eingabe.endzeit) ?? 0;
  if (stunden <= 0) {
    return { meldungen, stunden: 0, kosten: null, budgetVorschau: [], minijob: null, speicherbar: false };
  }

  // 2. Kosten- und Lohnberechnung
  const anteile = verteileStunden({
    gesamtStunden: stunden,
    paragraph: eingabe.paragraph,
    paragraph2: eingabe.paragraph2 ?? null,
    stunden2: eingabe.stunden2 ?? null,
  });
  const kosten = berechneEinsatzKosten({
    anteile,
    anfahrtPauschale: konfiguration.anfahrtPauschale,
    saetze: konfiguration.saetze,
    lohnProStunde: konfiguration.lohnProStunde,
  });

  // 3. Abwesenheiten (genehmigter Urlaub / Krankmeldung)
  const abwesenheit = await getAbwesenheitAmTag(eingabe.mitarbeiterId, eingabe.datum);
  if (abwesenheit) {
    meldungen.push({
      code: abwesenheit.typ === "urlaub" ? "mitarbeiter_im_urlaub" : "mitarbeiter_krank",
      schwere: "blockierend",
      text:
        abwesenheit.typ === "urlaub"
          ? `Mitarbeiter befindet sich im Urlaub (${abwesenheit.von} bis ${abwesenheit.bis}).`
          : `Mitarbeiter ist krankgemeldet (${abwesenheit.von} bis ${abwesenheit.bis}).`,
      feld: "mitarbeiterId",
    });
  }

  // 4. Doppelbuchung für Mitarbeiter und Kunde
  const tagesEinsaetze = await getEinsaetzeImZeitraum({ von: eingabe.datum, bis: eingabe.datum });
  for (const vorhanden of tagesEinsaetze) {
    if (optionen.bearbeiteterEinsatzId && vorhanden.id === optionen.bearbeiteterEinsatzId) continue;
    if (vorhanden.status === "abgesagt") continue;
    if (!vorhanden.startzeit) continue;
    const ueberschneidung = zeitenUeberschneidenSich(
      eingabe.startzeit,
      stunden,
      vorhanden.startzeit,
      vorhanden.stunden,
    );
    if (!ueberschneidung) continue;

    if (vorhanden.mitarbeiterId === eingabe.mitarbeiterId) {
      meldungen.push({
        code: "doppelbuchung_mitarbeiter",
        schwere: "blockierend",
        text:
          `Doppelbuchung: Der Mitarbeiter ist am ${eingabe.datum} von ` +
          `${vorhanden.startzeit} bis ${vorhanden.endzeit ?? "?"} Uhr bereits bei ` +
          `${vorhanden.kundenName} eingeplant.`,
        feld: "startzeit",
      });
    }
    if (vorhanden.kundenId === eingabe.kundenId) {
      meldungen.push({
        code: "doppelbuchung_kunde",
        schwere: "blockierend",
        text:
          `Doppelbuchung: Der Kunde hat am ${eingabe.datum} von ` +
          `${vorhanden.startzeit} bis ${vorhanden.endzeit ?? "?"} Uhr bereits einen Termin ` +
          `mit ${vorhanden.mitarbeiterName}.`,
        feld: "startzeit",
      });
    }
  }

  // 5. Budgetdeckung je Paragraph (inklusive Anfahrtspauschale)
  const kunde = await getKundeById(eingabe.kundenId);
  const budgetVorschau: ReturnType<typeof berechneBudgetVorschau>[] = [];
  if (kunde) {
    const lagen = berechneAlleBudgetLagen(kunde as unknown as Record<string, unknown>, konfiguration.saetze);
    // Beim Bearbeiten zählt der eigene bisherige Verbrauch nicht doppelt.
    let gutschrift: Partial<Record<Paragraph, number>> = {};
    if (optionen.bearbeiteterEinsatzId) {
      const alt = await getEinsatzById(optionen.bearbeiteterEinsatzId);
      if (alt && alt.kundenId === eingabe.kundenId) {
        gutschrift = {
          [alt.paragraph as Paragraph]: Number(alt.kosten1 ?? 0),
          ...(alt.paragraph2 ? { [alt.paragraph2 as Paragraph]: Number(alt.kosten2 ?? 0) } : {}),
        };
      }
    }

    for (const anteil of kosten.anteile) {
      const lage = lagen[anteil.paragraph];
      const rueckbuchung = gutschrift[anteil.paragraph] ?? 0;
      const bereinigteLage = {
        ...lage,
        restbudget: runde2(lage.restbudget + rueckbuchung),
        verfuegbareStunden:
          lage.stundensatz > 0
            ? runde2(Math.max(0, lage.restbudget + rueckbuchung) / lage.stundensatz)
            : 0,
      };
      const vorschau = berechneBudgetVorschau({ lage: bereinigteLage, kosten: anteil.gesamtKosten });
      budgetVorschau.push(vorschau);

      if (vorschau.reichtNicht) {
        meldungen.push({
          code: "budget_nicht_ausreichend",
          schwere: "blockierend",
          text:
            `Das verfügbare Budget des Paragraphen §${anteil.paragraph} reicht für diesen Einsatz ` +
            `nicht aus. Benötigt: ${formatEuro(anteil.gesamtKosten)} (inkl. Anfahrtspauschale), ` +
            `verfügbar: ${formatEuro(bereinigteLage.restbudget)}. ` +
            `Es fehlen ${formatEuro(vorschau.fehlbetrag)} – bitte einen zweiten Paragraphen hinzufügen.`,
          feld: anteil.paragraph === eingabe.paragraph ? "paragraph" : "paragraph2",
        });
      } else if (vorschau.stundenNachher < 1.5 && vorschau.restbudgetNachher >= 0) {
        meldungen.push({
          code: "budget_fast_erschoepft",
          schwere: "hinweis",
          text:
            `Nach diesem Einsatz verbleiben bei §${anteil.paragraph} nur noch ` +
            `${formatEuro(vorschau.restbudgetNachher)} (${formatStunden(vorschau.stundenNachher)}).`,
        });
      }
    }
  } else {
    meldungen.push({
      code: "kunde_unbekannt",
      schwere: "blockierend",
      text: "Der ausgewählte Kunde wurde nicht gefunden.",
      feld: "kundenId",
    });
  }

  // 6. Minijob-Grenze des Mitarbeiters
  const mitarbeiterDatensatz = await getMitarbeiterById(eingabe.mitarbeiterId);
  const monat = monatsSchluessel(eingabe.datum);
  const bisherigeLohnkosten = await getMonatsLohnkosten({
    mitarbeiterId: eingabe.mitarbeiterId,
    monat,
    ohneEinsatzId: optionen.bearbeiteterEinsatzId ?? null,
  });
  const minijob = pruefeMinijobGrenze({
    bisherigeLohnkosten,
    geplanteLohnkosten: kosten.lohnkosten,
    beschaeftigungsart: mitarbeiterDatensatz?.beschaeftigungsart ?? null,
  });
  if (minijob.ueberschritten) {
    meldungen.push({
      code: "minijob_ueberschritten",
      schwere: "warnung",
      text: minijob.meldung ?? "Minijob-Grenze überschritten.",
      feld: "mitarbeiterId",
    });
  } else if (minijob.vorwarnung) {
    meldungen.push({
      code: "minijob_fast_erreicht",
      schwere: "hinweis",
      text: minijob.meldung ?? "Minijob-Grenze fast erreicht.",
      feld: "mitarbeiterId",
    });
  }

  // Admins dürfen Budget- und Minijob-Sperren bewusst übersteuern; formale
  // Fehler (fehlende Zeiten, Doppelbuchung) bleiben immer blockierend.
  const uebersteuerbareCodes = new Set(["budget_nicht_ausreichend"]);
  const wirksameMeldungen =
    optionen.istAdmin && eingabe.uebersteuern
      ? meldungen.map((m) =>
          uebersteuerbareCodes.has(m.code) ? { ...m, schwere: "warnung" as const } : m,
        )
      : meldungen;

  return {
    meldungen: wirksameMeldungen,
    stunden,
    kosten,
    budgetVorschau,
    minijob,
    speicherbar: !hatBlockierendeMeldung(wirksameMeldungen),
  };
}

/** Informiert alle Administratoren über eine Minijob-Überschreitung. */
async function meldeMinijobAnAdmins(args: {
  mitarbeiterId: number;
  mitarbeiterName: string;
  monat: string;
  gesamtLohnkosten: number;
  einsatzId?: number | null;
}) {
  const nachricht =
    `${args.mitarbeiterName} überschreitet im Monat ${args.monat} die Minijob-Grenze: ` +
    `${formatEuro(args.gesamtLohnkosten)} von ${formatEuro(MINIJOB_GRENZE)}.`;

  await meldeWarnung({
    code: "minijob_ueberschritten",
    schwere: "warnung",
    titel: "Mitarbeiter überschreitet Minijob-Grenze",
    nachricht,
    mitarbeiterId: args.mitarbeiterId,
    monat: args.monat,
    einsatzId: args.einsatzId ?? null,
  });

  try {
    const alle = await getAllMitarbeiter();
    for (const person of alle.filter((m: { rolle: string }) => m.rolle === "admin" || m.rolle === "teamleitung")) {
      await createNotification({
        empfaengerId: person.id,
        titel: "⚠️ Minijob-Grenze überschritten",
        nachricht,
        typ: "warnung",
      });
    }
    await createNotification({
      empfaengerId: args.mitarbeiterId,
      titel: "⚠️ Minijob-Grenze überschritten",
      nachricht:
        `ACHTUNG! Mit dieser Planung überschreitest du die Minijob-Grenze von ` +
        `${formatEuro(MINIJOB_GRENZE)}. Geplant sind ${formatEuro(args.gesamtLohnkosten)}.`,
      typ: "warnung",
    });
  } catch (fehler) {
    console.warn("[Planung] Minijob-Benachrichtigung fehlgeschlagen:", fehler);
  }
}

// ── Router ──────────────────────────────────────────────────────────────────

export const planungRouter = router({
  // ── Stammdaten für die Planungsoberfläche ────────────────────────────────

  /** Verrechnungssätze, Stundenlohn und Anfahrtspauschale. */
  konfiguration: planungLesen.query(async () => {
    const konfiguration = await getSatzKonfiguration();
    return {
      ...konfiguration,
      minijobGrenze: MINIJOB_GRENZE,
      standardAnfahrtPauschale: ANFAHRT_PAUSCHALE,
    };
  }),

  /**
   * Mitarbeiterliste für die Planungsauswahl.
   *
   * Bewusst eine eigene Route: `admin.mitarbeiterList` bleibt Administratoren
   * vorbehalten, während die Teamleitung für die Planung nur die
   * Basisangaben (Name, Beschäftigungsart) benötigt – ohne Zugangs- oder
   * Vertragsdaten.
   */
  mitarbeiterListe: planungLesen.query(async ({ ctx }) => {
    const alle = await getAllMitarbeiter();
    const sichtbar = darfAllesSehen(ctx.portalMitarbeiter.rolle)
      ? alle
      : alle.filter((m: { id: number }) => m.id === ctx.mitarbeiterId);
    return sichtbar
      .filter((m: { aktiv: number }) => m.aktiv === 1)
      .map((m: any) => ({
        id: m.id,
        vorname: m.vorname,
        nachname: m.nachname,
        rolle: m.rolle,
        beschaeftigungsart: m.beschaeftigungsart,
        aktiv: m.aktiv,
      }));
  }),

  /** Ändert einen Verrechnungssatz (nur Admin). */
  setzeSatz: roleProcedure(["admin"])
    .input(
      z.object({
        paragraph: paragraphSchema,
        satzProStunde: z.number().min(0).max(500),
        lohnProStunde: z.number().min(0).max(500),
        anfahrtPauschale: z.number().min(0).max(200),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await setzeParagraphSatz({ ...input, geaendertVon: ctx.mitarbeiterId });
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "UPDATE",
        ressource: "paragraphSatz",
        details: `§${input.paragraph} = ${input.satzProStunde} €/Std., Lohn ${input.lohnProStunde} €/Std.`,
        status: "success",
      });
      return { success: true };
    }),

  // ── Planungsübersicht ────────────────────────────────────────────────────

  /**
   * Liefert die vollständige Planung eines Zeitraums:
   * Termine, Abwesenheiten, Touren, Mitarbeiterauslastung und Warnungen.
   *
   * `ansicht` steuert nur die Vorbelegung des Zeitraums; `von`/`bis` haben
   * Vorrang, sodass die Oberfläche beliebig navigieren kann.
   */
  uebersicht: planungLesen
    .input(
      z
        .object({
          ansicht: z.enum(["14tage", "woche", "monat"]).default("14tage"),
          startDatum: datumSchema.optional(),
          mitarbeiterId: z.number().int().positive().nullish(),
        })
        .default({ ansicht: "14tage" }),
    )
    .query(async ({ input, ctx }) => {
      const rolle = ctx.portalMitarbeiter.rolle;
      const alleSehen = darfAllesSehen(rolle);
      // Mitarbeiter sehen ausschließlich die eigene Planung.
      const filterMitarbeiterId = alleSehen ? (input.mitarbeiterId ?? null) : ctx.mitarbeiterId;

      const heute = zuDatumsString(new Date());
      const start = input.startDatum ?? heute;
      let von = start;
      let bis = addTage(start, 13);
      if (input.ansicht === "woche") {
        von = montagDerWoche(start);
        bis = addTage(von, 6);
      } else if (input.ansicht === "monat") {
        von = `${start.slice(0, 7)}-01`;
        const naechsterMonat = new Date(`${von}T12:00:00`);
        naechsterMonat.setMonth(naechsterMonat.getMonth() + 1);
        bis = addTage(zuDatumsString(naechsterMonat), -1);
      }

      const [termine, abwesenheiten, tourenListe, konfiguration] = await Promise.all([
        getEinsaetzeImZeitraum({ von, bis, nurMitarbeiterId: filterMitarbeiterId }),
        getAbwesenheitenImZeitraum({ von, bis, nurMitarbeiterId: filterMitarbeiterId }),
        getTourenImZeitraum({ von, bis, nurMitarbeiterId: filterMitarbeiterId }),
        getSatzKonfiguration(),
      ]);

      // Auslastung je Mitarbeiter im betroffenen Monat
      const monat = monatsSchluessel(von);
      const lohnkosten = alleSehen
        ? await getMonatsLohnkostenAlle(monat)
        : [
            {
              mitarbeiterId: ctx.mitarbeiterId,
              name: `${ctx.portalMitarbeiter.vorname} ${ctx.portalMitarbeiter.nachname}`,
              beschaeftigungsart: ctx.portalMitarbeiter.beschaeftigungsart ?? null,
              lohnkosten: await getMonatsLohnkosten({ mitarbeiterId: ctx.mitarbeiterId, monat }),
              stunden: 0,
            },
          ];

      const auslastung = lohnkosten.map((eintrag) => {
        const status = pruefeMinijobGrenze({
          bisherigeLohnkosten: eintrag.lohnkosten,
          beschaeftigungsart: eintrag.beschaeftigungsart,
        });
        return {
          mitarbeiterId: eintrag.mitarbeiterId,
          name: eintrag.name,
          beschaeftigungsart: eintrag.beschaeftigungsart,
          stunden: eintrag.stunden,
          lohnkosten: eintrag.lohnkosten,
          minijobGrenze: status.grenze,
          auslastungProzent: status.auslastungProzent,
          ueberschritten: status.ueberschritten,
          vorwarnung: status.vorwarnung,
        };
      });

      return {
        von,
        bis,
        ansicht: input.ansicht,
        monat,
        termine,
        abwesenheiten,
        touren: tourenListe,
        auslastung,
        konfiguration: { ...konfiguration, minijobGrenze: MINIJOB_GRENZE },
        rechte: {
          // Alle Mitarbeiter dürfen Termine planen (eigene Einsätze).
          // Nur Admin und Teamleitung dürfen Termine für andere MA planen.
          darfPlanen: true,
          darfLoeschen: rolle === "admin" || rolle === "teamleitung",
          darfAlleSehen: alleSehen,
        },
      };
    }),

  /**
   * Budgetübersicht eines Kunden: Restbudget, Verrechnungssatz und
   * verfügbare Betreuungsstunden je Paragraph.
   *
   *   §45b · 347,00 € · 36,00 €/Std. · 9,64 Std.
   */
  budgetUebersicht: planungLesen
    .input(z.object({ kundenId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [kunde, konfiguration] = await Promise.all([
        getKundeById(input.kundenId),
        getSatzKonfiguration(),
      ]);
      if (!kunde) throw new TRPCError({ code: "NOT_FOUND", message: "Kunde nicht gefunden." });
      const lagen = berechneAlleBudgetLagen(kunde as unknown as Record<string, unknown>, konfiguration.saetze);
      return {
        kundenId: kunde.id,
        name: `${kunde.vorname} ${kunde.nachname}`,
        pflegegrad: kunde.pflegegrad,
        anfahrtPauschale: konfiguration.anfahrtPauschale,
        lagen: Object.values(lagen),
      };
    }),

  /** Minijob-Status eines Mitarbeiters für einen Monat. */
  minijobStatus: planungLesen
    .input(
      z.object({
        mitarbeiterId: z.number().int().positive().optional(),
        monat: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const zielId = darfAllesSehen(ctx.portalMitarbeiter.rolle)
        ? (input.mitarbeiterId ?? ctx.mitarbeiterId)
        : ctx.mitarbeiterId;
      const monat = input.monat ?? monatsSchluessel(new Date());
      const [person, bisherigeLohnkosten] = await Promise.all([
        getMitarbeiterById(zielId),
        getMonatsLohnkosten({ mitarbeiterId: zielId, monat }),
      ]);
      return {
        mitarbeiterId: zielId,
        monat,
        ...pruefeMinijobGrenze({
          bisherigeLohnkosten,
          beschaeftigungsart: person?.beschaeftigungsart ?? null,
        }),
      };
    }),

  /** Minijob-Auslastung aller Mitarbeiter (Teamleitung/Admin/Buchhaltung). */
  minijobUebersicht: planungLesen
    .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
    .query(async ({ input, ctx }) => {
      if (!darfAllesSehen(ctx.portalMitarbeiter.rolle)) return [];
      const monat = input?.monat ?? monatsSchluessel(new Date());
      const alle = await getMonatsLohnkostenAlle(monat);
      return alle
        .map((eintrag) => {
          const status = pruefeMinijobGrenze({
            bisherigeLohnkosten: eintrag.lohnkosten,
            beschaeftigungsart: eintrag.beschaeftigungsart,
          });
          return { ...eintrag, monat, ...status };
        })
        .sort((a, b) => b.lohnkosten - a.lohnkosten);
    }),

  /**
   * Sammelkennzahlen für das Dashboard.
   *
   * Liefert in einem Aufruf: heutige Einsätze, aktive und freie Mitarbeiter,
   * offene Kassenanfragen und Genehmigungen, Budgetverbrauch je Kunde und je
   * Paragraph, Minijob-Warnungen, heutige Touren, kommende Urlaube,
   * Geburtstage, ablaufende Dokumente und offene Aufgaben.
   */
  dashboard: planungLesen.query(async ({ ctx }) => {
    const heute = zuDatumsString(new Date());
    const monat = monatsSchluessel(heute);
    const alleSehen = darfAllesSehen(ctx.portalMitarbeiter.rolle);
    const filterId = alleSehen ? null : ctx.mitarbeiterId;

    const [
      termineHeute,
      abwesenheitenHeute,
      tourenHeute,
      kommendeAbwesenheiten,
      lohnkosten,
      konfiguration,
      personen,
      warnungen,
    ] = await Promise.all([
      getEinsaetzeImZeitraum({ von: heute, bis: heute, nurMitarbeiterId: filterId }),
      getAbwesenheitenImZeitraum({ von: heute, bis: heute }),
      getTourenImZeitraum({ von: heute, bis: heute, nurMitarbeiterId: filterId }),
      getAbwesenheitenImZeitraum({ von: heute, bis: addTage(heute, 30) }),
      alleSehen ? getMonatsLohnkostenAlle(monat) : Promise.resolve([]),
      getSatzKonfiguration(),
      getAllMitarbeiter(),
      getWarnungen({ nurOffene: true, mitarbeiterId: alleSehen ? null : ctx.mitarbeiterId, limit: 50 }),
    ]);

    const aktivePersonen = personen.filter((m: { aktiv: number }) => m.aktiv === 1);
    const abwesendeIds = new Set(abwesenheitenHeute.map((a) => a.mitarbeiterId));
    const imEinsatzIds = new Set(termineHeute.filter((t) => t.status !== "abgesagt").map((t) => t.mitarbeiterId));

    // Minijob-Warnungen: Mitarbeiter über der Grenze
    const minijobWarnungen = lohnkosten
      .map((eintrag) => ({
        ...eintrag,
        status: pruefeMinijobGrenze({
          bisherigeLohnkosten: eintrag.lohnkosten,
          beschaeftigungsart: eintrag.beschaeftigungsart,
        }),
      }))
      .filter((eintrag) => eintrag.status.ueberschritten || eintrag.status.vorwarnung);

    // Budgetverbrauch je Kunde und je Paragraph
    const { getAllKunden } = await import("./db");
    const alleKunden = await getAllKunden();
    const budgetJeParagraph: Record<Paragraph, { budget: number; verbraucht: number; rest: number; stunden: number }> = {
      "45b": { budget: 0, verbraucht: 0, rest: 0, stunden: 0 },
      "45a": { budget: 0, verbraucht: 0, rest: 0, stunden: 0 },
      "39": { budget: 0, verbraucht: 0, rest: 0, stunden: 0 },
    };
    const kritischeKunden: Array<{ id: number; name: string; paragraph: Paragraph; rest: number; stunden: number }> = [];

    for (const kunde of alleKunden) {
      const lagen = berechneAlleBudgetLagen(kunde as unknown as Record<string, unknown>, konfiguration.saetze);
      for (const lage of Object.values(lagen)) {
        const eintrag = budgetJeParagraph[lage.paragraph];
        eintrag.budget = runde2(eintrag.budget + lage.budget);
        eintrag.verbraucht = runde2(eintrag.verbraucht + lage.verbraucht);
        eintrag.rest = runde2(eintrag.rest + Math.max(0, lage.restbudget));
        eintrag.stunden = runde2(eintrag.stunden + lage.verfuegbareStunden);
        if (lage.kritisch) {
          kritischeKunden.push({
            id: kunde.id,
            name: `${kunde.vorname} ${kunde.nachname}`,
            paragraph: lage.paragraph,
            rest: lage.restbudget,
            stunden: lage.verfuegbareStunden,
          });
        }
      }
    }

    // Geburtstage der nächsten 30 Tage (Mitarbeiter und Kunden)
    const geburtstage: Array<{ name: string; datum: string; typ: "mitarbeiter" | "kunde"; tageBis: number }> = [];
    const heuteDatum = new Date(`${heute}T12:00:00`);
    const sammleGeburtstag = (
      person: { vorname: string; nachname: string; geburtsdatum: unknown },
      typ: "mitarbeiter" | "kunde",
    ) => {
      if (!person.geburtsdatum) return;
      const geburt = zuDatumsString(person.geburtsdatum as string | Date);
      if (!geburt) return;
      // Nächsten Jahrestag bestimmen (auch über den Jahreswechsel hinweg)
      const naechster = new Date(`${heute.slice(0, 4)}-${geburt.slice(5, 10)}T12:00:00`);
      if (naechster < heuteDatum) naechster.setFullYear(naechster.getFullYear() + 1);
      const tageBis = Math.round((naechster.getTime() - heuteDatum.getTime()) / 86400000);
      if (tageBis <= 30) {
        geburtstage.push({
          name: `${person.vorname} ${person.nachname}`,
          datum: zuDatumsString(naechster),
          typ,
          tageBis,
        });
      }
    };
    for (const person of aktivePersonen) sammleGeburtstag(person as any, "mitarbeiter");
    for (const kunde of alleKunden) sammleGeburtstag(kunde as any, "kunde");
    geburtstage.sort((a, b) => a.tageBis - b.tageBis);

    // Offene Genehmigungen, Kassenanfragen und Leistungsnachweise
    const { getAllUrlaubsantraege, getAllKassenanfragen, getAllLeistungen } = await import("./db");
    const [urlaube, kassenanfragen, leistungen] = await Promise.all([
      getAllUrlaubsantraege(),
      getAllKassenanfragen().catch(() => [] as any[]),
      getAllLeistungen(),
    ]);
    const offeneUrlaube = urlaube.filter((u: { status: string }) => u.status === "beantragt");
    const offeneKassenanfragen = (kassenanfragen as any[]).filter(
      (k) => k.status === "offen" || k.status === "gesendet",
    );
    const offeneLeistungen = leistungen.filter(
      (l: { status: string }) => l.status === "offen" || l.status === "pruefung",
    );

    // Ablaufende Dokumente der nächsten 60 Tage (Zertifikate, Führerschein …)
    const ablaufendeDokumente = await getAblaufendeDokumente(addTage(heute, 60));

    return {
      datum: heute,
      monat,
      einsaetzeHeute: {
        gesamt: termineHeute.length,
        offen: termineHeute.filter((t) => t.status === "geplant" || t.status === "bestaetigt").length,
        abgeschlossen: termineHeute.filter((t) => t.status === "abgeschlossen").length,
        stunden: runde2(termineHeute.reduce((s, t) => s + t.stunden, 0)),
        liste: termineHeute,
      },
      mitarbeiter: {
        gesamt: aktivePersonen.length,
        imEinsatz: imEinsatzIds.size,
        abwesend: abwesendeIds.size,
        // Frei = aktiv, heute nicht abwesend und ohne Einsatz
        frei: aktivePersonen.filter((m: { id: number }) => !abwesendeIds.has(m.id) && !imEinsatzIds.has(m.id)).length,
      },
      offeneKassenanfragen: offeneKassenanfragen.length,
      offeneGenehmigungen: offeneUrlaube.length + offeneLeistungen.length,
      offeneUrlaubsantraege: offeneUrlaube.length,
      offeneLeistungsnachweise: offeneLeistungen.length,
      budgetJeParagraph,
      kritischeKunden: kritischeKunden.slice(0, 20),
      minijobWarnungen,
      tourenHeute,
      kommendeUrlaube: kommendeAbwesenheiten
        .filter((a) => a.typ === "urlaub" && a.von >= heute)
        .sort((a, b) => a.von.localeCompare(b.von))
        .slice(0, 10),
      geburtstage: geburtstage.slice(0, 10),
      ablaufendeDokumente: ablaufendeDokumente.slice(0, 10),
      offeneWarnungen: warnungen.length,
      warnungen: warnungen.slice(0, 10),
    };
  }),

  // ── Live-Prüfung ─────────────────────────────────────────────────────────

  /**
   * Prüft einen geplanten Termin, ohne ihn zu speichern.
   *
   * Liefert Stunden, Kosten, Budgetvorschau (vorher/nachher) und alle
   * Warnungen. Die Oberfläche ruft diese Route bei jeder Eingabe auf, damit
   * Warnungen live während der Planung erscheinen – nicht erst beim Speichern.
   */
  pruefe: planungLesen.input(terminEingabeSchema).query(async ({ input, ctx }) => {
    const ergebnis = await pruefeTermin(input, {
      istAdmin: ctx.portalMitarbeiter.rolle === "admin",
    });
    return {
      ...ergebnis,
      // Detailwerte für die Anzeige in der Einsatzzeile
      lohnkosten: ergebnis.kosten?.lohnkosten ?? 0,
      kostenGesamt: ergebnis.kosten?.gesamtKosten ?? 0,
      fahrtkosten: ergebnis.kosten?.fahrtkosten ?? 0,
    };
  }),

  /** Wie `pruefe`, aber für einen bereits bestehenden Termin. */
  pruefeBearbeitung: planungLesen
    .input(terminEingabeSchema.extend({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const ergebnis = await pruefeTermin(rest, {
        bearbeiteterEinsatzId: id,
        istAdmin: ctx.portalMitarbeiter.rolle === "admin",
      });
      return {
        ...ergebnis,
        lohnkosten: ergebnis.kosten?.lohnkosten ?? 0,
        kostenGesamt: ergebnis.kosten?.gesamtKosten ?? 0,
        fahrtkosten: ergebnis.kosten?.fahrtkosten ?? 0,
      };
    }),

  // ── Termine anlegen / ändern / löschen ───────────────────────────────────

  /** Legt einen geplanten Termin an und bucht das Budget. */
  erstelle: planungSchreiben.input(terminEingabeSchema).mutation(async ({ input, ctx }) => {
    const istAdmin = ctx.portalMitarbeiter.rolle === "admin";
    const pruefung = await pruefeTermin(input, { istAdmin });
    if (!pruefung.speicherbar || !pruefung.kosten) {
      const blockierend = pruefung.meldungen.filter((m) => m.schwere === "blockierend");
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: blockierend.map((m) => m.text).join(" "),
      });
    }

    const konfiguration = await getSatzKonfiguration();
    const anteil1 = pruefung.kosten.anteile.find((a) => a.paragraph === input.paragraph);
    const anteil2 = input.paragraph2
      ? pruefung.kosten.anteile.find((a) => a.paragraph === input.paragraph2)
      : undefined;

    const neueId = await erstellePlanungsEinsatz(
      {
        mitarbeiterId: input.mitarbeiterId,
        kundenId: input.kundenId,
        datum: input.datum,
        startzeit: input.startzeit.slice(0, 5),
        endzeit: input.endzeit.slice(0, 5),
        paragraph: input.paragraph,
        paragraph2: input.paragraph2 ?? null,
        stunden2: anteil2?.stunden ?? null,
        notizen: input.notizen ?? null,
        anfahrtPauschale: konfiguration.anfahrtPauschale,
        stundenGesamt: pruefung.stunden,
        stunden1: anteil1?.stunden ?? pruefung.stunden,
        kosten1: anteil1?.gesamtKosten ?? 0,
        kosten2: anteil2?.gesamtKosten ?? 0,
        lohnkosten: pruefung.kosten.lohnkosten,
      },
      ctx.mitarbeiterId,
    );

    // Budget sofort reservieren, damit parallele Planungen dasselbe Guthaben
    // nicht doppelt verplanen können.
    for (const anteil of pruefung.kosten.anteile) {
      await bucheBudget({
        kundenId: input.kundenId,
        paragraph: anteil.paragraph,
        betrag: anteil.gesamtKosten,
        stunden: anteil.stunden,
        mitarbeiterId: input.mitarbeiterId,
        einsatzId: neueId,
        beschreibung: `Planung Einsatz #${neueId} am ${input.datum}`,
      });
    }

    await createAuditLog({
      mitarbeiterId: ctx.mitarbeiterId,
      action: "CREATE",
      ressource: "einsatzplanung",
      details:
        `id=${neueId} mitarbeiter=${input.mitarbeiterId} kunde=${input.kundenId} ` +
        `${input.datum} ${input.startzeit}-${input.endzeit} ` +
        `${pruefung.stunden}h §${input.paragraph}${input.paragraph2 ? `+§${input.paragraph2}` : ""} ` +
        `Kosten=${pruefung.kosten.gesamtKosten}€ Lohn=${pruefung.kosten.lohnkosten}€`,
      status: "success",
    });

    // Minijob-Warnung auslösen (live gemeldet, hier dauerhaft protokolliert)
    if (pruefung.minijob?.ueberschritten) {
      const person = await getMitarbeiterById(input.mitarbeiterId);
      await meldeMinijobAnAdmins({
        mitarbeiterId: input.mitarbeiterId,
        mitarbeiterName: person ? `${person.vorname} ${person.nachname}` : `Mitarbeiter #${input.mitarbeiterId}`,
        monat: monatsSchluessel(input.datum),
        gesamtLohnkosten: pruefung.minijob.gesamtLohnkosten,
        einsatzId: neueId,
      });
    }

    // Terminbestätigung an den eingeplanten Mitarbeiter
    try {
      const kunde = await getKundeById(input.kundenId);
      await createNotification({
        empfaengerId: input.mitarbeiterId,
        titel: "📅 Neuer Einsatz geplant",
        nachricht:
          `${input.datum}, ${input.startzeit}–${input.endzeit} Uhr bei ` +
          `${kunde?.vorname ?? ""} ${kunde?.nachname ?? ""} (${formatStunden(pruefung.stunden)}).`,
        typ: "info",
      });
      if ((global as any).sseBroadcast) {
        (global as any).sseBroadcast(input.mitarbeiterId, "einsatz_update", {
          message: `Neuer Einsatz am ${input.datum}.`,
        });
      }
    } catch (fehler) {
      console.warn("[Planung] Terminbestätigung fehlgeschlagen:", fehler);
    }

    return { success: true, id: neueId, warnungen: pruefung.meldungen };
  }),

  /** Ändert einen bestehenden Termin und korrigiert die Budgetbuchung. */
  aktualisiere: planungSchreiben
    .input(terminEingabeSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...eingabe } = input;
      const alt = await getEinsatzById(id);
      if (!alt) throw new TRPCError({ code: "NOT_FOUND", message: "Termin nicht gefunden." });
      if (alt.status === "abgeschlossen" && ctx.portalMitarbeiter.rolle !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Abgeschlossene Einsätze können nur von einem Administrator geändert werden.",
        });
      }

      const istAdmin = ctx.portalMitarbeiter.rolle === "admin";
      const pruefung = await pruefeTermin(eingabe, { bearbeiteterEinsatzId: id, istAdmin });
      if (!pruefung.speicherbar || !pruefung.kosten) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pruefung.meldungen
            .filter((m) => m.schwere === "blockierend")
            .map((m) => m.text)
            .join(" "),
        });
      }

      // Alte Budgetbuchung zurücknehmen, neue setzen – so bleibt der
      // Kundenverbrauch exakt, auch wenn Paragraph oder Dauer wechseln.
      await storniereEinsatzBudget(id, ctx.mitarbeiterId);

      const konfiguration = await getSatzKonfiguration();
      const anteil1 = pruefung.kosten.anteile.find((a) => a.paragraph === eingabe.paragraph);
      const anteil2 = eingabe.paragraph2
        ? pruefung.kosten.anteile.find((a) => a.paragraph === eingabe.paragraph2)
        : undefined;

      await aktualisierePlanungsEinsatz(id, {
        mitarbeiterId: eingabe.mitarbeiterId,
        kundenId: eingabe.kundenId,
        datum: eingabe.datum,
        startzeit: eingabe.startzeit.slice(0, 5),
        endzeit: eingabe.endzeit.slice(0, 5),
        paragraph: eingabe.paragraph,
        paragraph2: eingabe.paragraph2 ?? null,
        stunden2: anteil2?.stunden ?? null,
        notizen: eingabe.notizen ?? null,
        anfahrtPauschale: konfiguration.anfahrtPauschale,
        stundenGesamt: pruefung.stunden,
        stunden1: anteil1?.stunden ?? pruefung.stunden,
        kosten1: anteil1?.gesamtKosten ?? 0,
        kosten2: anteil2?.gesamtKosten ?? 0,
        lohnkosten: pruefung.kosten.lohnkosten,
      });

      for (const anteil of pruefung.kosten.anteile) {
        await bucheBudget({
          kundenId: eingabe.kundenId,
          paragraph: anteil.paragraph,
          betrag: anteil.gesamtKosten,
          stunden: anteil.stunden,
          mitarbeiterId: eingabe.mitarbeiterId,
          einsatzId: id,
          beschreibung: `Änderung Einsatz #${id} am ${eingabe.datum}`,
        });
      }

      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "UPDATE",
        ressource: "einsatzplanung",
        details:
          `id=${id} vorher=${zuDatumsString(alt.datum)} ${alt.startzeit ?? "?"} §${alt.paragraph} | ` +
          `nachher=${eingabe.datum} ${eingabe.startzeit} §${eingabe.paragraph}` +
          `${eingabe.paragraph2 ? `+§${eingabe.paragraph2}` : ""} ${pruefung.stunden}h`,
        status: "success",
      });

      if (pruefung.minijob?.ueberschritten) {
        const person = await getMitarbeiterById(eingabe.mitarbeiterId);
        await meldeMinijobAnAdmins({
          mitarbeiterId: eingabe.mitarbeiterId,
          mitarbeiterName: person ? `${person.vorname} ${person.nachname}` : `Mitarbeiter #${eingabe.mitarbeiterId}`,
          monat: monatsSchluessel(eingabe.datum),
          gesamtLohnkosten: pruefung.minijob.gesamtLohnkosten,
          einsatzId: id,
        });
      }

      return { success: true, warnungen: pruefung.meldungen };
    }),

  /** Setzt den Status eines Termins (z. B. auf "abgesagt"). */
  setzeStatus: planungSchreiben
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["geplant", "bestaetigt", "abgeschlossen", "abgesagt"]),
        grund: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const einsatz = await getEinsatzById(input.id);
      if (!einsatz) throw new TRPCError({ code: "NOT_FOUND", message: "Termin nicht gefunden." });

      // Wird ein Termin abgesagt, fließt das reservierte Budget zurück.
      if (input.status === "abgesagt" && einsatz.status !== "abgesagt") {
        await storniereEinsatzBudget(input.id, ctx.mitarbeiterId);
      }
      await setzeEinsatzStatus(input.id, input.status);
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "UPDATE",
        ressource: "einsatzplanung",
        details: `id=${input.id} status=${input.status}${input.grund ? ` grund=${input.grund}` : ""}`,
        status: "success",
      });
      return { success: true };
    }),

  /**
   * Löscht einen Termin (Soft-Delete) und bucht das Budget zurück.
   * Nur Teamleitung und Administrator.
   */
  loesche: planungSchreiben
    .input(
      z.object({
        id: z.number().int().positive(),
        loeschgrund: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const einsatz = await getEinsatzById(input.id);
      if (!einsatz) throw new TRPCError({ code: "NOT_FOUND", message: "Termin nicht gefunden." });

      // Budget zurückbuchen, bevor der Datensatz als gelöscht markiert wird.
      if (einsatz.status !== "abgesagt") {
        await storniereEinsatzBudget(input.id, ctx.mitarbeiterId);
      }
      await loeschePlanungsEinsatz({
        id: input.id,
        geloeschtVon: ctx.mitarbeiterId,
        loeschgrund: input.loeschgrund ?? null,
      });
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "DELETE",
        ressource: "einsatzplanung",
        details: `id=${input.id} datum=${zuDatumsString(einsatz.datum)} grund=${input.loeschgrund ?? "-"}`,
        status: "success",
      });

      try {
        await createNotification({
          empfaengerId: einsatz.mitarbeiterId,
          titel: "🗑️ Einsatz gelöscht",
          nachricht: `Der Einsatz am ${zuDatumsString(einsatz.datum)} wurde aus der Planung entfernt.`,
          typ: "warnung",
        });
      } catch (fehler) {
        console.warn("[Planung] Löschbenachrichtigung fehlgeschlagen:", fehler);
      }

      return { success: true };
    }),

  // ── Warnungen ────────────────────────────────────────────────────────────

  warnungen: router({
    /** Listet Planungswarnungen (offen oder alle). */
    list: planungLesen
      .input(z.object({ nurOffene: z.boolean().default(true), limit: z.number().int().min(1).max(500).default(100) }).optional())
      .query(async ({ input, ctx }) => {
        const alleSehen = darfAllesSehen(ctx.portalMitarbeiter.rolle);
        return getWarnungen({
          nurOffene: input?.nurOffene ?? true,
          mitarbeiterId: alleSehen ? null : ctx.mitarbeiterId,
          limit: input?.limit ?? 100,
        });
      }),

    /** Bestätigt eine Warnung (Teamleitung/Admin). */
    bestaetige: planungSchreiben
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await bestaetigeWarnung(input.id, ctx.mitarbeiterId);
        await createAuditLog({
          mitarbeiterId: ctx.mitarbeiterId,
          action: "UPDATE",
          ressource: "planungsWarnung",
          details: `id=${input.id} bestaetigt`,
          status: "success",
        });
        return { success: true };
      }),

    /**
     * Löscht eine Warnung endgültig aus dem Arbeitsbereich.
     * Bestätigte Meldungen sollen den Arbeitsbereich nicht blockieren.
     */
    loesche: planungSchreiben
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await loescheWarnung(input.id, ctx.mitarbeiterId);
        await createAuditLog({
          mitarbeiterId: ctx.mitarbeiterId,
          action: "DELETE",
          ressource: "planungsWarnung",
          details: `id=${input.id}`,
          status: "success",
        });
        return { success: true };
      }),

    /** Räumt alle bereits bestätigten Warnungen auf einen Schlag ab. */
    loescheBestaetigte: planungSchreiben.mutation(async ({ ctx }) => {
      const anzahl = await loescheBestaetigteWarnungen(ctx.mitarbeiterId);
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "DELETE",
        ressource: "planungsWarnung",
        details: `bestaetigte=${anzahl}`,
        status: "success",
      });
      return { success: true, anzahl };
    }),
  }),

  // ── Tourenplanung (manuell durch den Mitarbeiter) ────────────────────────

  touren: router({
    /**
     * Liefert die Tour eines Mitarbeiters für einen Tag: alle zugewiesenen
     * Einsätze in der gespeicherten Reihenfolge, inklusive Kundendaten für
     * Navigation und Kontaktaufnahme.
     */
    tagesTour: planungLesen
      .input(
        z.object({
          datum: datumSchema,
          mitarbeiterId: z.number().int().positive().nullish(),
        }),
      )
      .query(async ({ input, ctx }) => {
        const alleSehen = darfAllesSehen(ctx.portalMitarbeiter.rolle);
        // Mitarbeiter sehen ausschließlich die eigene Tour.
        const zielId = alleSehen ? (input.mitarbeiterId ?? ctx.mitarbeiterId) : ctx.mitarbeiterId;

        const [termine, tourenListe] = await Promise.all([
          getEinsaetzeImZeitraum({ von: input.datum, bis: input.datum, nurMitarbeiterId: zielId }),
          getTourenImZeitraum({ von: input.datum, bis: input.datum, nurMitarbeiterId: zielId }),
        ]);

        const tour = tourenListe[0] ?? null;
        const reihenfolge = new Map<number, number>();
        for (const punkt of tour?.punkte ?? []) {
          if (punkt.einsatzId) reihenfolge.set(punkt.einsatzId, punkt.reihenfolge);
        }

        // Einsätze ohne gespeicherte Position hängen zeitlich sortiert hinten an.
        const sortiert = [...termine].sort((a, b) => {
          const posA = reihenfolge.get(a.id);
          const posB = reihenfolge.get(b.id);
          if (posA !== undefined && posB !== undefined) return posA - posB;
          if (posA !== undefined) return -1;
          if (posB !== undefined) return 1;
          return (a.startzeit ?? "").localeCompare(b.startzeit ?? "");
        });

        return {
          datum: input.datum,
          mitarbeiterId: zielId,
          tourId: tour?.id ?? null,
          punkte: sortiert,
          darfReihenfolgeAendern: zielId === ctx.mitarbeiterId || alleSehen,
        };
      }),

    /**
     * Speichert die vom Mitarbeiter festgelegte Besuchsreihenfolge.
     *
     * Mitarbeiter dürfen ausschließlich die Reihenfolge ihrer eigenen Tour
     * ändern – Einsatzzeiten und Kundenzuweisungen bleiben unangetastet.
     */
    speichereReihenfolge: planungLesen
      .input(
        z.object({
          datum: datumSchema,
          mitarbeiterId: z.number().int().positive(),
          einsatzIds: z.array(z.number().int().positive()).max(50),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const alleSehen = darfAllesSehen(ctx.portalMitarbeiter.rolle);
        if (input.mitarbeiterId !== ctx.mitarbeiterId && !alleSehen) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sie dürfen ausschließlich die Reihenfolge Ihrer eigenen Tour ändern.",
          });
        }

        // Nur Einsätze zulassen, die dem Mitarbeiter an diesem Tag gehören.
        const eigene = await getEinsaetzeImZeitraum({
          von: input.datum,
          bis: input.datum,
          nurMitarbeiterId: input.mitarbeiterId,
        });
        const erlaubteIds = new Set(eigene.map((e) => e.id));
        const gefiltert = input.einsatzIds.filter((id) => erlaubteIds.has(id));

        // Tour bei Bedarf anlegen, damit die Reihenfolge einen Anker hat.
        const vorhandene = await getTourenImZeitraum({
          von: input.datum,
          bis: input.datum,
          nurMitarbeiterId: input.mitarbeiterId,
        });
        let tourId = vorhandene[0]?.id ?? null;
        if (!tourId) {
          const { createTour } = await import("./db");
          tourId = await createTour({
            mitarbeiterId: input.mitarbeiterId,
            datum: input.datum,
            status: "geplant",
            titel: `Tour ${input.datum}`,
            angelegtVon: ctx.mitarbeiterId,
          } as any);
        }
        if (!tourId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Tour konnte nicht angelegt werden." });

        await speichereTourReihenfolge({
          tourId,
          einsatzIds: gefiltert,
          geaendertVon: ctx.mitarbeiterId,
        });
        await createAuditLog({
          mitarbeiterId: ctx.mitarbeiterId,
          action: "UPDATE",
          ressource: "tour",
          details: `tourId=${tourId} datum=${input.datum} reihenfolge=${gefiltert.join(",")}`,
          status: "success",
        });
        return { success: true, tourId, reihenfolge: gefiltert };
      }),

    /** Löscht eine Tour (Teamleitung/Admin). */
    loesche: planungSchreiben
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await loescheTour(input.id, ctx.mitarbeiterId);
        await createAuditLog({
          mitarbeiterId: ctx.mitarbeiterId,
          action: "DELETE",
          ressource: "tour",
          details: `id=${input.id}`,
          status: "success",
        });
        return { success: true };
      }),
  }),

  // ── Generische Löschfunktion ─────────────────────────────────────────────

  /**
   * Löscht einen Datensatz aus einem der verwalteten Bereiche.
   *
   * Überall, wo Daten angelegt werden, besitzt der Administrator eine
   * Löschfunktion. Gelöscht wird per Soft-Delete, damit Abrechnung und
   * Audit-Log nachvollziehbar bleiben.
   */
  loescheDatensatz: roleProcedure(["admin", "teamleitung"])
    .input(
      z.object({
        bereich: z.enum([
          "einsatz",
          "leistung",
          "fahrt",
          "urlaub",
          "krankmeldung",
          "tour",
          "warnung",
          "kassenanfrage",
          "neukundenaufnahme",
          "fuehrerschein",
        ]),
        id: z.number().int().positive(),
        grund: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const rawTabellen = {
        kassenanfrage: "kassenanfragen",
        neukundenaufnahme: "neukundenaufnahmen",
        fuehrerschein: "fuehrerschein_checks",
      } as const;

      if (input.bereich in rawTabellen) {
        await softDeleteRaw({
          tabelle: rawTabellen[input.bereich as keyof typeof rawTabellen],
          id: input.id,
          geloeschtVon: ctx.mitarbeiterId,
        });
      } else if (input.bereich === "einsatz") {
        // Einsätze immer über die Spezialroute löschen, damit das Budget
        // korrekt zurückgebucht wird.
        await storniereEinsatzBudget(input.id, ctx.mitarbeiterId);
        await loeschePlanungsEinsatz({
          id: input.id,
          geloeschtVon: ctx.mitarbeiterId,
          loeschgrund: input.grund ?? null,
        });
      } else {
        await softDelete({
          bereich: input.bereich as LoeschBereich,
          id: input.id,
          geloeschtVon: ctx.mitarbeiterId,
        });
      }

      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "DELETE",
        ressource: input.bereich,
        details: `id=${input.id} grund=${input.grund ?? "-"}`,
        status: "success",
      });
      return { success: true };
    }),
});

export type PlanungsEinsatzTyp = PlanungsEinsatz;
