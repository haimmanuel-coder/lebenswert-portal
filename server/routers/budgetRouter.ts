/**
 * budgetRouter.ts – Intelligentes Budgetmanagement (V2.2, A21–A27)
 *
 * A21: Jahresbudget CRUD (Admin)
 * A22: Monatsbudget-Berechnung + Mitarbeiter-Budgetanzeige
 * A23: KI-Planungsempfehlung (LLM)
 * A24: Budgetampel-Daten
 * A25: Jahresprognose
 * A26: Optimierungsvorschläge
 * A27: Controlling-Dashboard-Daten (Admin)
 */
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { jahresbudgets, kunden, einsaetze, controllingSnapshots } from "../../drizzle/schema";
import { eq, and, sql, desc, lte, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Berechnet das Monatsbudget basierend auf Restbudget und verbleibenden Monaten */
function berechneMonatsbudget(
  jahresbudgetCent: number,
  verbrauchtCent: number,
  gueltigAb: Date | string,
  gueltigBis: Date | string,
): number {
  const heute = new Date();
  const bis = new Date(gueltigBis);
  const ab = new Date(gueltigAb);

  // Verbleibende Monate bis Jahresende (mindestens 1)
  const verbleibendeMonateRaw =
    (bis.getFullYear() - heute.getFullYear()) * 12 +
    (bis.getMonth() - heute.getMonth()) +
    1;
  const verbleibendeMonateTotal =
    (bis.getFullYear() - ab.getFullYear()) * 12 + (bis.getMonth() - ab.getMonth()) + 1;

  const verbleibendeMonateAb = Math.max(1, verbleibendeMonateRaw);
  const restbudgetCent = Math.max(0, jahresbudgetCent - verbrauchtCent);

  return Math.round(restbudgetCent / verbleibendeMonateAb);
}

/** Budgetampel-Farbe basierend auf Verbrauchsprozent */
function ampelFarbe(verbrauchtCent: number, jahresbudgetCent: number): "gruen" | "gelb" | "rot" | "grau" {
  if (jahresbudgetCent === 0) return "grau";
  const prozent = (verbrauchtCent / jahresbudgetCent) * 100;
  if (prozent >= 90) return "rot";
  if (prozent >= 70) return "gelb";
  return "gruen";
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const budgetRouter = router({
  // ── A21: Jahresbudget CRUD (Admin) ────────────────────────────────────────

  /** Alle Jahresbudgets eines Kunden abrufen */
  getByKunde: protectedProcedure
    .input(z.object({ kundenId: z.number() }))
    .query(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      return db
        .select()
        .from(jahresbudgets)
        .where(eq(jahresbudgets.kundenId, input.kundenId))
        .orderBy(desc(jahresbudgets.gueltigAb));
    }),

  /** Jahresbudget anlegen (Admin) */
  create: adminProcedure
    .input(
      z.object({
        kundenId: z.number(),
        leistungsbereich: z.enum(["45b", "39", "45a", "privat", "sonstige"]),
        jahresbudgetCent: z.number().min(0),
        gueltigAb: z.string(), // YYYY-MM-DD
        gueltigBis: z.string(), // YYYY-MM-DD
        stundensatzCent: z.number().min(0).default(3500),
        notizen: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const result = await db.insert(jahresbudgets).values({
        kundenId: input.kundenId,
        leistungsbereich: input.leistungsbereich,
        jahresbudgetCent: input.jahresbudgetCent,
        verbrauchtCent: 0,
        gueltigAb: new Date(input.gueltigAb),
        gueltigBis: new Date(input.gueltigBis),
        stundensatzCent: input.stundensatzCent,
        notizen: input.notizen,
      });
      return { id: Number((result as any).insertId), success: true };
    }),

  /** Jahresbudget aktualisieren (Admin) */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        jahresbudgetCent: z.number().min(0).optional(),
        verbrauchtCent: z.number().min(0).optional(),
        stundensatzCent: z.number().min(0).optional(),
        notizen: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const { id, ...updates } = input;
      await db.update(jahresbudgets).set(updates).where(eq(jahresbudgets.id, id));
      return { success: true };
    }),

  /** Jahresbudget löschen (Admin) */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      await db.delete(jahresbudgets).where(eq(jahresbudgets.id, input.id));
      return { success: true };
    }),

  // ── A22: Monatsbudget-Berechnung + Mitarbeiter-Budgetanzeige ─────────────

  /**
   * Monatsbudget für einen Kunden und Leistungsbereich berechnen.
   * Mitarbeiter sehen nur €/h/% – kein Jahresbudget.
   */
  getMonatsbudget: protectedProcedure
    .input(
      z.object({
        kundenId: z.number(),
        leistungsbereich: z.enum(["45b", "39", "45a", "privat", "sonstige"]).optional(),
        monat: z.string().optional(), // YYYY-MM, default: aktueller Monat
      }),
    )
    .query(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const monat = input.monat ?? new Date().toISOString().slice(0, 7);
      const monatStart = `${monat}-01`;
      const monatEndeDate = new Date(parseInt(monat.slice(0, 4)), parseInt(monat.slice(5, 7)), 0);
      const monatEnde = monatEndeDate.toISOString().slice(0, 10);

      // Aktive Jahresbudgets für diesen Kunden
      const budgets = await db
        .select()
        .from(jahresbudgets)
        .where(
          and(
            eq(jahresbudgets.kundenId, input.kundenId),
            sql`${jahresbudgets.gueltigAb} <= ${monatEnde}`,
            sql`${jahresbudgets.gueltigBis} >= ${monatStart}`,
            ...(input.leistungsbereich
              ? [eq(jahresbudgets.leistungsbereich, input.leistungsbereich)]
              : []),
          ),
        );

      // Geplante Stunden im Monat (aus Einsätzen)
      const geplanteEinsaetze = await db
        .select({
          paragraph: einsaetze.paragraph,
          dauerStunden: einsaetze.dauerStunden,
        })
        .from(einsaetze)
        .where(
          and(
            eq(einsaetze.kundenId, input.kundenId),
            sql`${einsaetze.datum} >= ${monatStart}`,
            sql`${einsaetze.datum} <= ${monatEnde}`,
            sql`${einsaetze.geloeschtAt} IS NULL`,
          ),
        );

      return budgets.map((b) => {
        const monatsbudgetCent = berechneMonatsbudget(
          b.jahresbudgetCent,
          b.verbrauchtCent,
          b.gueltigAb instanceof Date ? b.gueltigAb.toISOString().slice(0, 10) : String(b.gueltigAb),
          b.gueltigBis instanceof Date ? b.gueltigBis.toISOString().slice(0, 10) : String(b.gueltigBis),
        );
        const restbudgetCent = Math.max(0, b.jahresbudgetCent - b.verbrauchtCent);
        const verbrauchProzent =
          b.jahresbudgetCent > 0
            ? Math.round((b.verbrauchtCent / b.jahresbudgetCent) * 100)
            : 0;
        const monatsbudgetStunden =
          b.stundensatzCent > 0
            ? Math.round((monatsbudgetCent / b.stundensatzCent) * 10) / 10
            : 0;

        // Geplante Stunden für diesen Leistungsbereich im Monat
        const geplanteStunden = geplanteEinsaetze
          .filter((e) => e.paragraph === b.leistungsbereich || b.leistungsbereich === "privat")
          .reduce((sum, e) => sum + parseFloat(e.dauerStunden ?? "0"), 0);

        return {
          id: b.id,
          leistungsbereich: b.leistungsbereich,
          // Mitarbeiter-Ansicht: nur Monatsbudget
          monatsbudgetEuro: monatsbudgetCent / 100,
          monatsbudgetStunden,
          geplanteStunden: Math.round(geplanteStunden * 10) / 10,
          // Prozentanzeige
          verbrauchProzent,
          restbudgetEuro: restbudgetCent / 100,
          ampel: ampelFarbe(b.verbrauchtCent, b.jahresbudgetCent),
          // Admin-Felder (Jahresbudget)
          jahresbudgetEuro: b.jahresbudgetCent / 100,
          verbrauchtEuro: b.verbrauchtCent / 100,
          stundensatzEuro: b.stundensatzCent / 100,
          gueltigAb: b.gueltigAb,
          gueltigBis: b.gueltigBis,
        };
      });
    }),

  // ── A24: Budgetampel-Übersicht (alle Kunden) ─────────────────────────────

  /**
   * Budgetampel für alle aktiven Kunden (für Dashboard und Kundenliste).
   * Gibt für jeden Kunden die Ampelfarbe und den Verbrauchsprozentsatz zurück.
   */
  getAmpelUebersicht: protectedProcedure.query(async () => {
    const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
    const heute = new Date().toISOString().slice(0, 10);

    const aktiveBudgets = await db
      .select({
        kundenId: jahresbudgets.kundenId,
        leistungsbereich: jahresbudgets.leistungsbereich,
        jahresbudgetCent: jahresbudgets.jahresbudgetCent,
        verbrauchtCent: jahresbudgets.verbrauchtCent,
        gueltigAb: jahresbudgets.gueltigAb,
        gueltigBis: jahresbudgets.gueltigBis,
      })
      .from(jahresbudgets)
      .where(
        and(
          sql`${jahresbudgets.gueltigAb} <= ${heute}`,
          sql`${jahresbudgets.gueltigBis} >= ${heute}`,
        ),
      );

    // Gruppierung nach Kunde: schlechteste Ampelfarbe gewinnt
    const kundenMap = new Map<
      number,
      { ampel: "gruen" | "gelb" | "rot" | "grau"; maxProzent: number; bereiche: string[] }
    >();

    for (const b of aktiveBudgets) {
      const farbe = ampelFarbe(b.verbrauchtCent, b.jahresbudgetCent);
      const prozent =
        b.jahresbudgetCent > 0
          ? Math.round((b.verbrauchtCent / b.jahresbudgetCent) * 100)
          : 0;
      const existing = kundenMap.get(b.kundenId);
      const rangMap = { grau: 0, gruen: 1, gelb: 2, rot: 3 };
      if (!existing || rangMap[farbe] > rangMap[existing.ampel]) {
        kundenMap.set(b.kundenId, {
          ampel: farbe,
          maxProzent: prozent,
          bereiche: existing ? [...existing.bereiche, b.leistungsbereich] : [b.leistungsbereich],
        });
      } else {
        existing.bereiche.push(b.leistungsbereich);
      }
    }

    return Array.from(kundenMap.entries()).map(([kundenId, data]) => ({
      kundenId,
      ...data,
    }));
  }),

  // ── A25: Jahresprognose ───────────────────────────────────────────────────

  getJahresprognose: protectedProcedure
    .input(z.object({ kundenId: z.number() }))
    .query(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const heute = new Date();
      const jahresstart = `${heute.getFullYear()}-01-01`;
      const jahresende = `${heute.getFullYear()}-12-31`;

      const budgets = await db
        .select()
        .from(jahresbudgets)
        .where(
          and(
            eq(jahresbudgets.kundenId, input.kundenId),
            sql`${jahresbudgets.gueltigAb} <= ${jahresende}`,
            sql`${jahresbudgets.gueltigBis} >= ${jahresstart}`,
          ),
        );

      const vergangeneMonateImJahr = new Date().getMonth() + 1; // 1–12

      return budgets.map((b) => {
        const restbudgetCent = Math.max(0, b.jahresbudgetCent - b.verbrauchtCent);
        const durchschnittProMonatCent =
          vergangeneMonateImJahr > 0
            ? Math.round(b.verbrauchtCent / vergangeneMonateImJahr)
            : 0;
        const prognostiziertesJahresendeCent =
          durchschnittProMonatCent * 12;
        const differenzCent =
          b.jahresbudgetCent - prognostiziertesJahresendeCent;
        const auslastungTyp: "unterausgelastet" | "optimal" | "ueberausgelastet" =
          differenzCent > b.jahresbudgetCent * 0.1
            ? "unterausgelastet"
            : differenzCent < -(b.jahresbudgetCent * 0.05)
              ? "ueberausgelastet"
              : "optimal";

        return {
          leistungsbereich: b.leistungsbereich,
          jahresbudgetEuro: b.jahresbudgetCent / 100,
          verbrauchtEuro: b.verbrauchtCent / 100,
          restbudgetEuro: restbudgetCent / 100,
          durchschnittProMonatEuro: durchschnittProMonatCent / 100,
          prognostiziertesJahresendeEuro: prognostiziertesJahresendeCent / 100,
          differenzEuro: differenzCent / 100,
          auslastungTyp,
          verbrauchProzent:
            b.jahresbudgetCent > 0
              ? Math.round((b.verbrauchtCent / b.jahresbudgetCent) * 100)
              : 0,
        };
      });
    }),

  // ── A23: KI-Planungsempfehlung ────────────────────────────────────────────

  getKiEmpfehlung: protectedProcedure
    .input(z.object({ kundenId: z.number() }))
    .query(async ({ input, ctx }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const heute = new Date().toISOString().slice(0, 10);

      // Kundendaten
      const [kunde] = await db
        .select({ vorname: kunden.vorname, nachname: kunden.nachname, pflegegrad: kunden.pflegegrad })
        .from(kunden)
        .where(eq(kunden.id, input.kundenId));

      if (!kunde) throw new Error("Kunde nicht gefunden");

      // Aktive Budgets
      const budgets = await db
        .select()
        .from(jahresbudgets)
        .where(
          and(
            eq(jahresbudgets.kundenId, input.kundenId),
            sql`${jahresbudgets.gueltigAb} <= ${heute}`,
            sql`${jahresbudgets.gueltigBis} >= ${heute}`,
          ),
        );

      if (budgets.length === 0) {
        return {
          empfehlung: "Für diesen Kunden sind keine aktiven Jahresbudgets hinterlegt. Bitte zuerst Jahresbudgets anlegen.",
          optimierungen: [],
        };
      }

      const budgetInfo = budgets
        .map(
          (b) =>
            `${b.leistungsbereich}: ${(b.jahresbudgetCent / 100).toFixed(2)}€ Jahresbudget, ${(b.verbrauchtCent / 100).toFixed(2)}€ verbraucht (${b.jahresbudgetCent > 0 ? Math.round((b.verbrauchtCent / b.jahresbudgetCent) * 100) : 0}%)`,
        )
        .join("\n");

      const prompt = `Du bist ein Experte für ambulante Pflegeplanung nach SGB XI. 
Analysiere die folgenden Budgetdaten für ${kunde.vorname} ${kunde.nachname} (Pflegegrad ${kunde.pflegegrad}) und gib eine kurze, praxisnahe Empfehlung zur optimalen Budgetausnutzung.

Aktuelle Budgets:
${budgetInfo}

Gib eine strukturierte Empfehlung mit:
1. Kurze Einschätzung der aktuellen Situation (2-3 Sätze)
2. Konkrete Optimierungsvorschläge (max. 3 Punkte)
3. Hinweis auf mögliche Kombinationen (§45b + §39 etc.)

Antworte auf Deutsch, sachlich und ohne rechtliche Beratung. Weise darauf hin, dass dies eine unverbindliche Planungshilfe ist.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Du bist ein Planungsassistent für ambulante Pflegedienste. Gib kurze, praxisnahe Empfehlungen zur Budgetoptimierung.",
            },
            { role: "user", content: prompt },
          ],
        });

        const empfehlung =
          (response as any)?.choices?.[0]?.message?.content ?? "Keine Empfehlung verfügbar.";

        return {
          empfehlung,
          optimierungen: budgets
            .filter((b) => {
              const prozent =
                b.jahresbudgetCent > 0
                  ? (b.verbrauchtCent / b.jahresbudgetCent) * 100
                  : 0;
              return prozent < 50;
            })
            .map((b) => ({
              leistungsbereich: b.leistungsbereich,
              hinweis: `Budget ${b.leistungsbereich} erst zu ${b.jahresbudgetCent > 0 ? Math.round((b.verbrauchtCent / b.jahresbudgetCent) * 100) : 0}% ausgeschöpft – Potenzial vorhanden`,
            })),
        };
      } catch {
        return {
          empfehlung: "KI-Empfehlung vorübergehend nicht verfügbar. Bitte später erneut versuchen.",
          optimierungen: [],
        };
      }
    }),

  // ── A26: Optimierungsvorschläge ───────────────────────────────────────────

  getOptimierungsvorschlaege: protectedProcedure
    .input(z.object({ kundenId: z.number() }))
    .query(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const heute = new Date().toISOString().slice(0, 10);
      const monatStart = heute.slice(0, 7) + "-01";

      const budgets = await db
        .select()
        .from(jahresbudgets)
        .where(
          and(
            eq(jahresbudgets.kundenId, input.kundenId),
            sql`${jahresbudgets.gueltigAb} <= ${heute}`,
            sql`${jahresbudgets.gueltigBis} >= ${heute}`,
          ),
        );

      const vorschlaege: { typ: string; titel: string; beschreibung: string; prioritaet: "hoch" | "mittel" | "niedrig" }[] = [];

      for (const b of budgets) {
        const prozent =
          b.jahresbudgetCent > 0
            ? (b.verbrauchtCent / b.jahresbudgetCent) * 100
            : 0;
        const restCent = b.jahresbudgetCent - b.verbrauchtCent;
        const monateVerbleibend =
          Math.max(
            1,
            (new Date(b.gueltigBis).getFullYear() - new Date().getFullYear()) * 12 +
              new Date(b.gueltigBis).getMonth() -
              new Date().getMonth() +
              1,
          );

        // Budgetverfall-Warnung
        if (prozent < 30 && monateVerbleibend <= 3) {
          vorschlaege.push({
            typ: "budgetverfall",
            titel: `§${b.leistungsbereich}: Budgetverfall droht`,
            beschreibung: `Noch ${(restCent / 100).toFixed(0)}€ verfügbar, aber nur noch ${monateVerbleibend} Monate. Einsatzfrequenz erhöhen.`,
            prioritaet: "hoch",
          });
        }

        // Unterauslastung
        if (prozent < 50 && monateVerbleibend > 3) {
          vorschlaege.push({
            typ: "unterauslastung",
            titel: `§${b.leistungsbereich}: Unterauslastung`,
            beschreibung: `Budget erst zu ${Math.round(prozent)}% genutzt. Monatlich ${(restCent / 100 / monateVerbleibend).toFixed(0)}€ zusätzlich planbar.`,
            prioritaet: "mittel",
          });
        }

        // Überauslastung
        if (prozent > 90) {
          vorschlaege.push({
            typ: "ueberauslastung",
            titel: `§${b.leistungsbereich}: Budget fast erschöpft`,
            beschreibung: `${Math.round(prozent)}% verbraucht. Nur noch ${(restCent / 100).toFixed(0)}€ verfügbar. Alternative Leistungsbereiche prüfen.`,
            prioritaet: "hoch",
          });
        }
      }

      // Kombinations-Vorschlag §45b + §39
      const hat45b = budgets.find((b) => b.leistungsbereich === "45b");
      const hat39 = budgets.find((b) => b.leistungsbereich === "39");
      if (hat45b && hat39) {
        const prozent45b =
          hat45b.jahresbudgetCent > 0
            ? (hat45b.verbrauchtCent / hat45b.jahresbudgetCent) * 100
            : 0;
        if (prozent45b > 80) {
          vorschlaege.push({
            typ: "kombination",
            titel: "§45b erschöpft – §39 kombinieren",
            beschreibung:
              "§45b-Budget fast aufgebraucht. Verhinderungspflege (§39) kann ergänzend genutzt werden.",
            prioritaet: "mittel",
          });
        }
      }

      return vorschlaege.sort((a, b) => {
        const rang = { hoch: 3, mittel: 2, niedrig: 1 };
        return rang[b.prioritaet] - rang[a.prioritaet];
      });
    }),

  // ── A27: Controlling-Dashboard (Admin) ───────────────────────────────────

  getControllingDaten: adminProcedure
    .input(
      z.object({
        monatVon: z.string().optional(), // YYYY-MM
        monatBis: z.string().optional(), // YYYY-MM
        mitarbeiterId: z.number().optional(),
        leistungsbereich: z.enum(["45b", "39", "45a", "privat", "sonstige", "alle"]).optional(),
        pflegegrad: z.number().optional(),
        kostentraegerId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const heute = new Date().toISOString().slice(0, 10);
      const monatVon = input.monatVon ?? `${new Date().getFullYear()}-01`;
      const monatBis = input.monatBis ?? heute.slice(0, 7);

      // Alle aktiven Jahresbudgets im Zeitraum
      const budgets = await db
        .select({
          id: jahresbudgets.id,
          kundenId: jahresbudgets.kundenId,
          leistungsbereich: jahresbudgets.leistungsbereich,
          jahresbudgetCent: jahresbudgets.jahresbudgetCent,
          verbrauchtCent: jahresbudgets.verbrauchtCent,
          gueltigAb: jahresbudgets.gueltigAb,
          gueltigBis: jahresbudgets.gueltigBis,
          stundensatzCent: jahresbudgets.stundensatzCent,
          kundenVorname: kunden.vorname,
          kundenNachname: kunden.nachname,
          pflegegrad: kunden.pflegegrad,
          kostentraegerId: kunden.kostentraegerId,
        })
        .from(jahresbudgets)
        .leftJoin(kunden, eq(jahresbudgets.kundenId, kunden.id))
        .where(
          and(
            sql`${jahresbudgets.gueltigAb} <= ${`${monatBis}-31`}`,
            sql`${jahresbudgets.gueltigBis} >= ${`${monatVon}-01`}`,
            ...(input.leistungsbereich && input.leistungsbereich !== "alle"
              ? [eq(jahresbudgets.leistungsbereich, input.leistungsbereich as any)]
              : []),
            ...(input.pflegegrad ? [eq(kunden.pflegegrad, input.pflegegrad)] : []),
            ...(input.kostentraegerId
              ? [eq(kunden.kostentraegerId, input.kostentraegerId)]
              : []),
          ),
        );

      // Aggregierte Kennzahlen
      const gesamtJahresbudgetCent = budgets.reduce((s: number, b) => s + b.jahresbudgetCent, 0);
      const gesamtVerbrauchtCent = budgets.reduce((s: number, b) => s + b.verbrauchtCent, 0);
      const gesamtRestCent = Math.max(0, gesamtJahresbudgetCent - gesamtVerbrauchtCent);
      const durchschnittVerbrauchProzent =
        gesamtJahresbudgetCent > 0
          ? Math.round((gesamtVerbrauchtCent / gesamtJahresbudgetCent) * 100)
          : 0;

      // Ampel-Verteilung
      const ampelVerteilung = { gruen: 0, gelb: 0, rot: 0, grau: 0 };
      for (const b of budgets) {
        const farbe = ampelFarbe(b.verbrauchtCent, b.jahresbudgetCent);
        ampelVerteilung[farbe]++;
      }

      // Gesamtstunden aus Einsätzen im Zeitraum
      const einsatzDaten = await db
        .select({
          kundenId: einsaetze.kundenId,
          paragraph: einsaetze.paragraph,
          dauerStunden: einsaetze.dauerStunden,
          status: einsaetze.status,
        })
        .from(einsaetze)
        .where(
          and(
            sql`${einsaetze.datum} >= ${`${monatVon}-01`}`,
            sql`${einsaetze.datum} <= ${`${monatBis}-31`}`,
            sql`${einsaetze.geloeschtAt} IS NULL`,
            ...(input.mitarbeiterId
              ? [eq(einsaetze.mitarbeiterId, input.mitarbeiterId)]
              : []),
          ),
        );

      const gesamtStunden = einsatzDaten.reduce(
        (s, e) => s + parseFloat(e.dauerStunden ?? "0"),
        0,
      );
      const abgeschlosseneStunden = einsatzDaten
        .filter((e) => e.status === "abgeschlossen")
        .reduce((s: number, e) => s + parseFloat(e.dauerStunden ?? "0"), 0);

      // Prognose: hochrechnen auf Jahresende
      const vergangeneMonateImJahr = new Date().getMonth() + 1; // 1–12
      const prognostiziertesJahresendeEuro =
        vergangeneMonateImJahr > 0
          ? (gesamtVerbrauchtCent / 100 / vergangeneMonateImJahr) * 12
          : 0;

      return {
        kennzahlen: {
          gesamtJahresbudgetEuro: gesamtJahresbudgetCent / 100,
          gesamtVerbrauchtEuro: gesamtVerbrauchtCent / 100,
          gesamtRestEuro: gesamtRestCent / 100,
          durchschnittVerbrauchProzent,
          gesamtStunden: Math.round(gesamtStunden * 10) / 10,
          abgeschlosseneStunden: Math.round(abgeschlosseneStunden * 10) / 10,
          prognostiziertesJahresendeEuro: Math.round(prognostiziertesJahresendeEuro),
          anzahlKunden: new Set(budgets.map((b) => b.kundenId)).size,
        },
        ampelVerteilung,
        budgets: budgets.map((b) => ({
          id: b.id,
          kundenId: b.kundenId,
          kundenName: `${b.kundenVorname ?? ""} ${b.kundenNachname ?? ""}`.trim(),
          pflegegrad: b.pflegegrad,
          leistungsbereich: b.leistungsbereich,
          jahresbudgetEuro: b.jahresbudgetCent / 100,
          verbrauchtEuro: b.verbrauchtCent / 100,
          restEuro: Math.max(0, b.jahresbudgetCent - b.verbrauchtCent) / 100,
          verbrauchProzent:
            b.jahresbudgetCent > 0
              ? Math.round((b.verbrauchtCent / b.jahresbudgetCent) * 100)
              : 0,
          ampel: ampelFarbe(b.verbrauchtCent, b.jahresbudgetCent),
          monatsbudgetEuro:
            berechneMonatsbudget(
              b.jahresbudgetCent,
              b.verbrauchtCent,
              b.gueltigAb instanceof Date ? b.gueltigAb.toISOString().slice(0, 10) : String(b.gueltigAb),
              b.gueltigBis instanceof Date ? b.gueltigBis.toISOString().slice(0, 10) : String(b.gueltigBis),
            ) / 100,
        })),
      };
    }),
});
