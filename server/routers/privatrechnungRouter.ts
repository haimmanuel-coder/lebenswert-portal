/**
 * privatrechnungRouter.ts
 * Aufgaben 12–16 aus Lastenheft V2.1:
 * - §45a Umwidmung (Budget-Warnungen, Sperrlogik)
 * - Sonderfahrten (km × 0,35 €)
 * - Erweiterbare Rechnungspositionen
 * - Automatische Privatrechnung (PDF + E-Mail)
 * - Import-Assistent (Excel/CSV → JSON → DB)
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure, portalProtected } from "../portalAuth";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── §45a Umwidmung ───────────────────────────────────────────────────────────

export const umwidmungRouter = router({
  update: adminProcedure
    .input(z.object({
      kundenId: z.number().int().positive(),
      aktiv: z.boolean(),
      budgetMax: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(
        sql`UPDATE kunden SET umwidmungAktiv = ${input.aktiv ? 1 : 0}, umwidmungBudgetMax = ${input.budgetMax ?? 0} WHERE id = ${input.kundenId}`
      );
      return { success: true };
    }),

  status: portalProtected
    .input(z.object({ kundenId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(
        sql`SELECT umwidmungAktiv, umwidmungBudgetMax, umwidmungVerbraucht FROM kunden WHERE id = ${input.kundenId} LIMIT 1`
      );
      const k = (rows as any).rows?.[0] ?? (rows as any[])[0];
      if (!k) throw new TRPCError({ code: "NOT_FOUND" });
      const max = parseFloat(String(k.umwidmungBudgetMax ?? 0));
      const verbraucht = parseFloat(String(k.umwidmungVerbraucht ?? 0));
      const rest = Math.max(0, max - verbraucht);
      const prozent = max > 0 ? Math.round((verbraucht / max) * 100) : 0;
      return {
        aktiv: !!k.umwidmungAktiv,
        budgetMax: max, verbraucht, rest, prozent,
        warnung80: prozent >= 80 && prozent < 90,
        warnung90: prozent >= 90 && prozent < 100,
        gesperrt: prozent >= 100,
      };
    }),

  warnungen: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(
      sql`SELECT id, vorname, nachname, umwidmungBudgetMax, umwidmungVerbraucht FROM kunden WHERE umwidmungAktiv = 1 AND aktiv = 1`
    );
    const list = (rows as any).rows ?? (rows as any[]);
    return list.map((k: any) => {
      const max = parseFloat(String(k.umwidmungBudgetMax ?? 0));
      const verbraucht = parseFloat(String(k.umwidmungVerbraucht ?? 0));
      const prozent = max > 0 ? Math.round((verbraucht / max) * 100) : 0;
      return { ...k, rest: Math.max(0, max - verbraucht), prozent, gesperrt: prozent >= 100 };
    }).filter((k: any) => k.prozent >= 80);
  }),
});

// ─── Sonderfahrten ────────────────────────────────────────────────────────────

export const sonderfahrtRouter = router({
  list: portalProtected
    .input(z.object({
      mitarbeiterId: z.number().int().optional(),
      kundenId: z.number().int().optional(),
      monat: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // Basis-Abfrage ohne dynamisches WHERE – filtern in JS für Typensicherheit
      const rows = await db.execute(
        sql`SELECT sf.*, k.vorname AS kundeVorname, k.nachname AS kundeNachname,
                   m.vorname AS maVorname, m.nachname AS maNachname
            FROM sonderfahrten sf
            LEFT JOIN kunden k ON sf.kundenId = k.id
            LEFT JOIN mitarbeiter m ON sf.mitarbeiterId = m.id
            ORDER BY sf.datum DESC`
      );
      let list = (rows as any).rows ?? (rows as any[]);
      const maId = input.mitarbeiterId ?? ctx.mitarbeiterId;
      list = list.filter((r: any) => r.mitarbeiterId === maId);
      if (input.kundenId) list = list.filter((r: any) => r.kundenId === input.kundenId);
      if (input.monat) list = list.filter((r: any) => r.monat === input.monat);
      return list;
    }),

  create: portalProtected
    .input(z.object({
      einsatzId: z.number().int().optional(),
      kundenId: z.number().int().positive(),
      datum: z.string(),
      startAdresse: z.string().optional(),
      zielAdresse: z.string().optional(),
      kilometer: z.number().min(0),
      beschreibung: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const monat = input.datum.substring(0, 7);
      await db.execute(
        sql`INSERT INTO sonderfahrten (einsatzId, mitarbeiterId, kundenId, datum, startAdresse, zielAdresse, kilometer, beschreibung, monat)
            VALUES (${input.einsatzId ?? null}, ${ctx.mitarbeiterId}, ${input.kundenId}, ${input.datum},
                    ${input.startAdresse ?? null}, ${input.zielAdresse ?? null}, ${input.kilometer},
                    ${input.beschreibung ?? null}, ${monat})`
      );
      return { success: true };
    }),

  monatsSumme: portalProtected
    .input(z.object({ kundenId: z.number().int().positive(), monat: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { summe: 0, positionen: [] };
      const rows = await db.execute(
        sql`SELECT * FROM sonderfahrten WHERE kundenId = ${input.kundenId} AND monat = ${input.monat} ORDER BY datum`
      );
      const positionen = (rows as any).rows ?? (rows as any[]);
      const summe = positionen.reduce((s: number, r: any) => s + parseFloat(String(r.kilometer ?? 0)) * 0.35, 0);
      return { summe: Math.round(summe * 100) / 100, positionen };
    }),
});

// ─── Rechnungspositionen ──────────────────────────────────────────────────────

export const rechnungspositionRouter = router({
  list: portalProtected
    .input(z.object({ kundenId: z.number().int().positive(), monat: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(
        sql`SELECT * FROM rechnungspositionen WHERE kundenId = ${input.kundenId} AND monat = ${input.monat} ORDER BY createdAt`
      );
      return (rows as any).rows ?? (rows as any[]);
    }),

  create: portalProtected
    .input(z.object({
      kundenId: z.number().int().positive(),
      einsatzId: z.number().int().optional(),
      monat: z.string(),
      kategorie: z.enum(["einkauf","begleitservice","eintrittsgeld","parkgebuehr","porto","medikamente","sonstige"]),
      beschreibung: z.string().min(1),
      menge: z.number().min(0.01).default(1),
      einzelpreis: z.number().min(0),
      bemerkung: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(
        sql`INSERT INTO rechnungspositionen (kundenId, mitarbeiterId, einsatzId, monat, kategorie, beschreibung, menge, einzelpreis, bemerkung)
            VALUES (${input.kundenId}, ${ctx.mitarbeiterId}, ${input.einsatzId ?? null}, ${input.monat},
                    ${input.kategorie}, ${input.beschreibung}, ${input.menge}, ${input.einzelpreis}, ${input.bemerkung ?? null})`
      );
      return { success: true };
    }),

  delete: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`DELETE FROM rechnungspositionen WHERE id = ${input.id}`);
      return { success: true };
    }),
});

// ─── Privatrechnung ───────────────────────────────────────────────────────────

export const privatrechnungRouter = router({
  list: adminProcedure
    .input(z.object({ kundenId: z.number().int().optional(), monat: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(
        sql`SELECT pr.*, k.vorname, k.nachname FROM privatrechnungen pr LEFT JOIN kunden k ON pr.kundenId = k.id ORDER BY pr.createdAt DESC`
      );
      let list = (rows as any).rows ?? (rows as any[]);
      if (input.kundenId) list = list.filter((r: any) => r.kundenId === input.kundenId);
      if (input.monat) list = list.filter((r: any) => r.monat === input.monat);
      return list;
    }),

  erstellen: adminProcedure
    .input(z.object({
      kundenId: z.number().int().positive(),
      monat: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rechnungsnummer = `RG-${input.monat.replace("-","")}-${input.kundenId}`;
      const existing = await db.execute(
        sql`SELECT id FROM privatrechnungen WHERE rechnungsnummer = ${rechnungsnummer} LIMIT 1`
      );
      if (((existing as any).rows ?? (existing as any[])).length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: `Rechnung ${rechnungsnummer} existiert bereits.` });
      }

      const [sfRows, posRows] = await Promise.all([
        db.execute(sql`SELECT kilometer FROM sonderfahrten WHERE kundenId = ${input.kundenId} AND monat = ${input.monat}`),
        db.execute(sql`SELECT menge, einzelpreis FROM rechnungspositionen WHERE kundenId = ${input.kundenId} AND monat = ${input.monat}`),
      ]);
      const sonderfahrten = (sfRows as any).rows ?? (sfRows as any[]);
      const positionen = (posRows as any).rows ?? (posRows as any[]);
      const sfSumme = sonderfahrten.reduce((s: number, r: any) => s + parseFloat(String(r.kilometer ?? 0)) * 0.35, 0);
      const posSumme = positionen.reduce((s: number, r: any) => s + parseFloat(String(r.menge ?? 1)) * parseFloat(String(r.einzelpreis ?? 0)), 0);
      const gesamtbetrag = Math.round((sfSumme + posSumme) * 100) / 100;

      await db.execute(
        sql`INSERT INTO privatrechnungen (rechnungsnummer, kundenId, monat, gesamtbetrag, erstelltVon) VALUES (${rechnungsnummer}, ${input.kundenId}, ${input.monat}, ${gesamtbetrag}, ${ctx.adminId})`
      );
      await db.execute(sql`UPDATE sonderfahrten SET abgerechnet = 1 WHERE kundenId = ${input.kundenId} AND monat = ${input.monat}`);
      await db.execute(sql`UPDATE rechnungspositionen SET abgerechnet = 1 WHERE kundenId = ${input.kundenId} AND monat = ${input.monat}`);

      return { success: true, rechnungsnummer, gesamtbetrag };
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["entwurf","versendet","bezahlt","storniert"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`UPDATE privatrechnungen SET status = ${input.status} WHERE id = ${input.id}`);
      return { success: true };
    }),

  details: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "NOT_FOUND" });
      const rows = await db.execute(
        sql`SELECT pr.*, k.vorname, k.nachname, k.strasse, k.plz, k.ort, k.versicherungsnummer
            FROM privatrechnungen pr LEFT JOIN kunden k ON pr.kundenId = k.id WHERE pr.id = ${input.id} LIMIT 1`
      );
      const rechnung = ((rows as any).rows ?? (rows as any[]))[0];
      if (!rechnung) throw new TRPCError({ code: "NOT_FOUND" });
      const [sfRows, posRows] = await Promise.all([
        db.execute(sql`SELECT * FROM sonderfahrten WHERE kundenId = ${rechnung.kundenId} AND monat = ${rechnung.monat}`),
        db.execute(sql`SELECT * FROM rechnungspositionen WHERE kundenId = ${rechnung.kundenId} AND monat = ${rechnung.monat}`),
      ]);
      return {
        rechnung,
        sonderfahrten: (sfRows as any).rows ?? (sfRows as any[]),
        positionen: (posRows as any).rows ?? (posRows as any[]),
      };
    }),
});

// ─── Import-Assistent ─────────────────────────────────────────────────────────

export const importRouter = router({
  protokolle: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(
      sql`SELECT ip.id AS id, ip.dateiname, ip.importiertVon, ip.anzahlNeu, ip.anzahlAktualisiert, ip.anzahlFehler, ip.fehlerDetails, ip.createdAt, m.vorname, m.nachname FROM importprotokolle ip LEFT JOIN mitarbeiter m ON ip.importiertVon = m.id ORDER BY ip.createdAt DESC LIMIT 50`
    );
    return (rows as any).rows ?? (rows as any[]);
  }),

  aenderungsprotokoll: adminProcedure
    .input(z.object({
      tabelle: z.string().optional(),
      datensatzId: z.number().int().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(
        sql`SELECT ap.id AS id, ap.tabelle, ap.datensatzId, ap.feld, ap.alterWert, ap.neuerWert, ap.geaendertVon, ap.importquelle, ap.createdAt, m.vorname, m.nachname FROM aenderungsprotokoll ap LEFT JOIN mitarbeiter m ON ap.geaendertVon = m.id ORDER BY ap.createdAt DESC LIMIT ${input.limit}`
      );
      let list = (rows as any).rows ?? (rows as any[]);
      if (input.tabelle) list = list.filter((r: any) => r.tabelle === input.tabelle);
      if (input.datensatzId) list = list.filter((r: any) => r.datensatzId === input.datensatzId);
      return list;
    }),

  importKunden: adminProcedure
    .input(z.object({
      kunden: z.array(z.object({
        vorname: z.string(),
        nachname: z.string(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        pflegegrad: z.number().int().min(1).max(5).optional(),
        paragraph: z.string().optional(),
        kostentraeger: z.string().optional(),
        versicherungsnummer: z.string().optional(),
        budget45b: z.number().optional(),
        budget45a: z.number().optional(),
        budget39: z.number().optional(),
      })),
      dateiname: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let anzahlNeu = 0, anzahlAktualisiert = 0, anzahlFehler = 0;
      const fehlerDetails: string[] = [];

      for (const k of input.kunden) {
        try {
          const existingRows = await db.execute(
            sql`SELECT id, vorname, nachname, strasse, plz, ort, telefon, pflegegrad, paragraph, versicherungsnummer, budget45b, budget45a, budget39 FROM kunden WHERE vorname = ${k.vorname.trim()} AND nachname = ${k.nachname.trim()} LIMIT 1`
          );
          const existingKunde = ((existingRows as any).rows ?? (existingRows as any[]))[0];

          if (existingKunde) {
            const felder: Array<{ feld: string; alt: any; neu: any }> = [
              { feld: "strasse", alt: existingKunde.strasse, neu: k.strasse },
              { feld: "plz", alt: existingKunde.plz, neu: k.plz },
              { feld: "ort", alt: existingKunde.ort, neu: k.ort },
              { feld: "telefon", alt: existingKunde.telefon, neu: k.telefon },
              { feld: "pflegegrad", alt: existingKunde.pflegegrad, neu: k.pflegegrad },
              { feld: "paragraph", alt: existingKunde.paragraph, neu: k.paragraph },
              { feld: "versicherungsnummer", alt: existingKunde.versicherungsnummer, neu: k.versicherungsnummer },
              { feld: "budget45b", alt: existingKunde.budget45b, neu: k.budget45b },
              { feld: "budget45a", alt: existingKunde.budget45a, neu: k.budget45a },
              { feld: "budget39", alt: existingKunde.budget39, neu: k.budget39 },
            ].filter(f => f.neu !== undefined && String(f.neu) !== String(f.alt ?? ""));

            if (felder.length > 0) {
              for (const f of felder) {
                await db.execute(
                  sql`UPDATE kunden SET ${sql.raw(f.feld)} = ${f.neu} WHERE id = ${existingKunde.id}`
                );
                await db.execute(
                  sql`INSERT INTO aenderungsprotokoll (tabelle, datensatzId, feld, alterWert, neuerWert, geaendertVon, importquelle)
                      VALUES ('kunden', ${existingKunde.id}, ${f.feld}, ${String(f.alt ?? "")}, ${String(f.neu)}, ${ctx.adminId}, ${input.dateiname ?? "import"})`
                );
              }
              anzahlAktualisiert++;
            }
          } else {
            await db.execute(
              sql`INSERT INTO kunden (vorname, nachname, strasse, plz, ort, telefon, pflegegrad, paragraph, versicherungsnummer, budget45b, budget45a, budget39, aktiv)
                  VALUES (${k.vorname}, ${k.nachname}, ${k.strasse ?? null}, ${k.plz ?? null}, ${k.ort ?? null},
                          ${k.telefon ?? null}, ${k.pflegegrad ?? 2}, ${k.paragraph ?? "45b"},
                          ${k.versicherungsnummer ?? null}, ${k.budget45b ?? 0}, ${k.budget45a ?? 0}, ${k.budget39 ?? 0}, 1)`
            );
            anzahlNeu++;
          }
        } catch (e: any) {
          anzahlFehler++;
          fehlerDetails.push(`${k.vorname} ${k.nachname}: ${e.message}`);
        }
      }

      await db.execute(
        sql`INSERT INTO importprotokolle (dateiname, importiertVon, anzahlNeu, anzahlAktualisiert, anzahlFehler, fehlerDetails)
            VALUES (${input.dateiname ?? null}, ${ctx.adminId}, ${anzahlNeu}, ${anzahlAktualisiert}, ${anzahlFehler}, ${fehlerDetails.length > 0 ? JSON.stringify(fehlerDetails) : null})`
      );

      return { success: true, anzahlNeu, anzahlAktualisiert, anzahlFehler, fehlerDetails };
    }),
});
