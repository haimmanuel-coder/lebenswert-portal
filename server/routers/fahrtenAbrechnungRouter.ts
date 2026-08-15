/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FAHRTENNACHWEISE-ABRECHNUNGS-ROUTER
 *  Zeitraum: 16. eines Monats bis 15. des Folgemonats
 *  Freigabe durch Admin → automatischer E-Mail-Versand am 18.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { sendEmail } from "../emailService";
import PDFDocument from "pdfkit";
import { pruefeLeistungsnachweisAbschluss, erstellePflegekassenCsv, erstelleStundennachweisCsv } from "../monatsabschlussService";
import { FIRMENDATEN } from "../../shared/firmendaten";
import JSZip from "jszip";
import { erstelleSicheresExportpaket, protokolliereSicherenExportversand, sichereExportEmail } from "../secureExportService";

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

/** Berechnet den aktuellen Abrechnungszeitraum (16.–15.) */
function berechneAktuellenZeitraum(referenz?: Date): { von: Date; bis: Date; label: string } {
  const heute = referenz ?? new Date();
  const tag = heute.getDate();
  const monat = heute.getMonth(); // 0-basiert
  const jahr = heute.getFullYear();

  let vonJahr: number, vonMonat: number;
  let bisJahr: number, bisMonat: number;

  if (tag >= 16) {
    // Aktueller Monat: 16. bis 15. des nächsten Monats
    vonJahr = jahr;
    vonMonat = monat;
    bisJahr = monat === 11 ? jahr + 1 : jahr;
    bisMonat = monat === 11 ? 0 : monat + 1;
  } else {
    // Wir sind vor dem 16.: Vormonat 16. bis 15. dieses Monats
    vonJahr = monat === 0 ? jahr - 1 : jahr;
    vonMonat = monat === 0 ? 11 : monat - 1;
    bisJahr = jahr;
    bisMonat = monat;
  }

  const von = new Date(vonJahr, vonMonat, 16);
  const bis = new Date(bisJahr, bisMonat, 15);

  const monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const label = `${String(von.getDate()).padStart(2, "0")}.${monate[von.getMonth()]} ${von.getFullYear()} – ${String(bis.getDate()).padStart(2, "0")}.${monate[bis.getMonth()]} ${bis.getFullYear()}`;

  return { von, bis, label };
}

/** Formatiert ein Datum als YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Generiert ein PDF für den Fahrtnachweis und gibt Buffer zurück */
async function generierefahrtnachweisPdf(
  fahrten: Array<{
    datum: string;
    mitarbeiterName: string;
    kundenName: string;
    startOrt: string;
    zielOrt: string;
    km: number;
    euro: number;
    zweck: string;
  }>,
  label: string,
  gesamtKm: number,
  gesamtEuro: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(18).fillColor("#2d6a2d").text(FIRMENDATEN.name, { align: "center" });
    doc.fontSize(13).fillColor("#333").text("Fahrtennachweise", { align: "center" });
    doc.fontSize(11).fillColor("#555").text(`Abrechnungszeitraum: ${label}`, { align: "center" });
    doc.fontSize(9).fillColor("#888").text(`${FIRMENDATEN.strasse}, ${FIRMENDATEN.plz} ${FIRMENDATEN.ort} | IK ${FIRMENDATEN.ikNummer}`, { align: "center" });
    doc.moveDown(1.2);

    // Tabellenkopf
    const col = { datum: 50, ma: 130, kunde: 240, km: 340, euro: 390, zweck: 440 };
    doc.fontSize(9).fillColor("#fff");
    doc.rect(50, doc.y, 500, 18).fill("#2d6a2d");
    const headerY = doc.y - 18 + 4;
    doc.fillColor("#fff")
      .text("Datum", col.datum, headerY)
      .text("Mitarbeiter", col.ma, headerY)
      .text("Kunde", col.kunde, headerY)
      .text("km", col.km, headerY)
      .text("€", col.euro, headerY)
      .text("Zweck", col.zweck, headerY);
    doc.moveDown(0.3);

    // Zeilen
    fahrten.forEach((f, i) => {
      const y = doc.y;
      if (i % 2 === 0) doc.rect(50, y, 500, 16).fill("#f0f7f0");
      doc.fillColor("#333").fontSize(8)
        .text(f.datum, col.datum, y + 3)
        .text(f.mitarbeiterName, col.ma, y + 3)
        .text(f.kundenName, col.kunde, y + 3)
        .text(f.km.toFixed(1), col.km, y + 3)
        .text(f.euro.toFixed(2), col.euro, y + 3)
        .text(f.zweck || "–", col.zweck, y + 3);
      doc.moveDown(0.5);
    });

    // Summenzeile
    doc.moveDown(0.5);
    doc.rect(50, doc.y, 500, 20).fill("#2d6a2d");
    const sumY = doc.y - 20 + 5;
    doc.fillColor("#fff").fontSize(10)
      .text(`Gesamt: ${gesamtKm.toFixed(1)} km`, col.datum, sumY)
      .text(`${gesamtEuro.toFixed(2)} €`, col.euro, sumY);

    doc.moveDown(2);
    doc.fontSize(8).fillColor("#888")
      .text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")} | ${FIRMENDATEN.name} | ${FIRMENDATEN.strasse}, ${FIRMENDATEN.plz} ${FIRMENDATEN.ort} | Tel: ${FIRMENDATEN.telefon}`, { align: "center" });

    doc.end();
  });
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const fahrtenAbrechnungRouter = router({

  /** Aktuellen Abrechnungszeitraum berechnen */
  aktuellerZeitraum: protectedProcedure.query(async () => {
    const { von, bis, label } = berechneAktuellenZeitraum();
    return { von: toDateStr(von), bis: toDateStr(bis), label };
  }),

  /** Alle Abrechnungen auflisten */
  list: adminProcedure.query(async () => {
    const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
    const rows = await db.execute(sql`
      SELECT fa.*,
             CONCAT(m.vorname, ' ', m.nachname) AS freigegebenVonName
      FROM fahrtenAbrechnungen fa
      LEFT JOIN mitarbeiter m ON fa.freigegebenVon = m.id
      ORDER BY fa.zeitraumVon DESC
      LIMIT 24
    `);
    return (rows as any[])[0] ?? rows;
  }),

  /** Fahrten eines Zeitraums zusammenführen und Abrechnung erstellen/aktualisieren */
  zusammenfuehren: adminProcedure
    .input(z.object({
      zeitraumVon: z.string().optional(), // YYYY-MM-DD, optional = aktueller Zeitraum
      zeitraumBis: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;

      let von: string, bis: string, label: string;
      if (input.zeitraumVon && input.zeitraumBis) {
        von = input.zeitraumVon;
        bis = input.zeitraumBis;
        const vonD = new Date(von);
        const bisD = new Date(bis);
        const monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        label = `${String(vonD.getDate()).padStart(2, "0")}.${monate[vonD.getMonth()]} ${vonD.getFullYear()} – ${String(bisD.getDate()).padStart(2, "0")}.${monate[bisD.getMonth()]} ${bisD.getFullYear()}`;
      } else {
        const z = berechneAktuellenZeitraum();
        von = toDateStr(z.von);
        bis = toDateStr(z.bis);
        label = z.label;
      }

      // Fahrten im Zeitraum aggregieren
      const fahrtenRows = await db.execute(sql`
        SELECT 
          f.id, f.datum, f.km, f.zweck, f.startOrt, f.zielOrt,
          f.mitarbeiterId,
          CONCAT(m.vorname, ' ', m.nachname) AS mitarbeiterName,
          COALESCE(CONCAT(k.vorname, ' ', k.nachname), '–') AS kundenName,
          ROUND(f.km * 0.35, 2) AS euro
        FROM fahrten f
        LEFT JOIN mitarbeiter m ON f.mitarbeiterId = m.id
        LEFT JOIN kunden k ON f.kundenId = k.id
        WHERE f.datum BETWEEN ${von} AND ${bis}
          AND (f.geloeschtAt IS NULL OR f.geloeschtAt > NOW())
        ORDER BY f.datum ASC, m.nachname ASC
      `);

      const fahrten: any[] = (fahrtenRows as any[])[0] ?? fahrtenRows;
      const anzahl = fahrten.length;
      const gesamtKm = fahrten.reduce((s: number, f: any) => s + Number(f.km ?? 0), 0);
      const gesamtEuro = fahrten.reduce((s: number, f: any) => s + Number(f.euro ?? 0), 0);

      // Abrechnung upsert
      await db.execute(sql`
        INSERT INTO fahrtenAbrechnungen (zeitraumVon, zeitraumBis, label, status, anzahlFahrten, gesamtKm, gesamtEuro)
        VALUES (${von}, ${bis}, ${label}, 'offen', ${anzahl}, ${gesamtKm.toFixed(2)}, ${gesamtEuro.toFixed(2)})
        ON DUPLICATE KEY UPDATE
          label = VALUES(label),
          anzahlFahrten = VALUES(anzahlFahrten),
          gesamtKm = VALUES(gesamtKm),
          gesamtEuro = VALUES(gesamtEuro),
          updatedAt = NOW()
      `);

      return { anzahl, gesamtKm, gesamtEuro, label, von, bis };
    }),

  /** Admin-Freigabe erteilen und PDF generieren */
  freigeben: adminProcedure
    .input(z.object({ abrechnungId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;

      // Abrechnung laden
      const rows = await db.execute(sql`
        SELECT * FROM fahrtenAbrechnungen WHERE id = ${input.abrechnungId}
      `);
      const abr: any = ((rows as any[])[0] ?? rows)[0];
      if (!abr) throw new Error("Abrechnung nicht gefunden");
      if (abr.status === "versendet") throw new Error("Abrechnung wurde bereits versendet");

      // Fahrten laden für PDF
      const fahrtenRows = await db.execute(sql`
        SELECT 
          DATE_FORMAT(f.datum, '%d.%m.%Y') AS datum,
          CONCAT(m.vorname, ' ', m.nachname) AS mitarbeiterName,
          COALESCE(CONCAT(k.vorname, ' ', k.nachname), '–') AS kundenName,
          COALESCE(f.startOrt, '–') AS startOrt,
          COALESCE(f.zielOrt, '–') AS zielOrt,
          f.km, ROUND(f.km * 0.35, 2) AS euro,
          COALESCE(f.zweck, '–') AS zweck
        FROM fahrten f
        LEFT JOIN mitarbeiter m ON f.mitarbeiterId = m.id
        LEFT JOIN kunden k ON f.kundenId = k.id
        WHERE f.datum BETWEEN ${abr.zeitraumVon} AND ${abr.zeitraumBis}
          AND (f.geloeschtAt IS NULL OR f.geloeschtAt > NOW())
        ORDER BY f.datum ASC
      `);
      const fahrten: any[] = (fahrtenRows as any[])[0] ?? fahrtenRows;

      // PDF generieren
      const pdfBuffer = await generierefahrtnachweisPdf(
        fahrten,
        abr.label,
        Number(abr.gesamtKm),
        Number(abr.gesamtEuro)
      );

      // PDF in S3 speichern
      const { storagePut } = await import("../storage");
      const pdfKey = `fahrtennachweise/${abr.zeitraumVon}_${abr.zeitraumBis}.pdf`;
      const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, "application/pdf");

      // Status auf freigegeben setzen
      await db.execute(sql`
        UPDATE fahrtenAbrechnungen
        SET status = 'freigegeben',
            freigegebenVon = ${ctx.user.id},
            freigegebenAt = NOW(),
            pdfKey = ${pdfKey},
            pdfUrl = ${pdfUrl}
        WHERE id = ${input.abrechnungId}
      `);

      return { success: true, pdfUrl, anzahlFahrten: fahrten.length };
    }),

  /** Manuell an Steuerbüro senden */
  senden: adminProcedure
    .input(z.object({ abrechnungId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;

      // Abrechnung laden
      const rows = await db.execute(sql`
        SELECT * FROM fahrtenAbrechnungen WHERE id = ${input.abrechnungId}
      `);
      const abr: any = ((rows as any[])[0] ?? rows)[0];
      if (!abr) throw new Error("Abrechnung nicht gefunden");
      if (abr.status !== "freigegeben") throw new Error("Abrechnung muss zuerst freigegeben werden");

      // Steuerbüro-E-Mail aus Einstellungen
      const einstellRows = await db.execute(sql`
        SELECT wert FROM systemEinstellungen WHERE schluessel = 'steuerbuero_email'
      `);
      const emailRows: any[] = (einstellRows as any[])[0] ?? einstellRows;
      const empfaengerEmail = emailRows[0]?.wert;
      if (!empfaengerEmail) throw new Error("Keine Steuerbüro-E-Mail hinterlegt. Bitte unter Einstellungen → System konfigurieren.");

      const nameRows = await db.execute(sql`
        SELECT wert FROM systemEinstellungen WHERE schluessel = 'steuerbuero_name'
      `);
      const nameArr: any[] = (nameRows as any[])[0] ?? nameRows;
      const empfaengerName = nameArr[0]?.wert ?? "Steuerbüro";

      if (!abr.pdfKey) throw new Error("Für diese Abrechnung ist kein freigegebenes PDF hinterlegt.");
      const paket = await erstelleSicheresExportpaket({
        db,
        typ: "fahrtennachweis",
        referenz: `fahrtenAbrechnung:${abr.id}`,
        dateiname: `Fahrtennachweise_${abr.zeitraumVon}_${abr.zeitraumBis}.pdf`,
        bestehenderDateiKey: abr.pdfKey,
        empfaengerEmail,
        erstelltVon: ctx.user.id,
      });

      const mailResult = await sendEmail({
        to: empfaengerEmail,
        subject: `Fahrtennachweise ${abr.label} – Seniorenassistenz Bernhardt`,
        html: sichereExportEmail({ titel: "Fahrtennachweise", zeitraum: abr.label, abrufUrl: paket.abrufUrl }),
      });
      if (!mailResult.success) throw new Error(mailResult.error ?? "Sicherer Link konnte nicht versendet werden.");
      await protokolliereSicherenExportversand(db, paket.id);

      // Status aktualisieren
      await db.execute(sql`
        UPDATE fahrtenAbrechnungen
        SET status = 'versendet',
            versendetAt = NOW(),
            empfaengerEmail = ${empfaengerEmail}
        WHERE id = ${input.abrechnungId}
      `);

      return { success: true, empfaengerEmail };
    }),

  /** Steuerbüro-E-Mail-Einstellung lesen */
  getEinstellungen: adminProcedure.query(async () => {
    const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
    const rows = await db.execute(sql`
      SELECT schluessel, wert FROM systemEinstellungen
      WHERE schluessel IN ('steuerbuero_email', 'steuerbuero_name', 'fahrtnachweis_auto_versand')
    `);
    const arr: any[] = (rows as any[])[0] ?? rows;
    const result: Record<string, string> = {};
    arr.forEach((r: any) => { result[r.schluessel] = r.wert; });
    return result;
  }),

  /** Steuerbüro-E-Mail-Einstellung speichern */
  saveEinstellungen: adminProcedure
    .input(z.object({
      steuerbuero_email: z.string().email("Ungültige E-Mail-Adresse"),
      steuerbuero_name: z.string().min(1),
      fahrtnachweis_auto_versand: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const dbOrNull = await getDb();
      if (!dbOrNull) throw new Error('Datenbankverbindung nicht verfügbar');
      const db = dbOrNull;
      const entries = [
        ["steuerbuero_email", input.steuerbuero_email],
        ["steuerbuero_name", input.steuerbuero_name],
        ["fahrtnachweis_auto_versand", input.fahrtnachweis_auto_versand ? "true" : "false"],
      ];
      for (const [k, v] of entries) {
        await db.execute(sql`
          INSERT INTO systemEinstellungen (schluessel, wert)
          VALUES (${k}, ${v})
          ON DUPLICATE KEY UPDATE wert = VALUES(wert), updatedAt = NOW()
        `);
      }
      return { success: true };
    }),

  /** Leistungsnachweis-Abschlussprüfung für einen Monat */
  leistungsnachweisStatus: adminProcedure
    .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      return pruefeLeistungsnachweisAbschluss(input.monat);
    }),

  /** Pflegekassen-CSV exportieren (nur wenn alle LNW abgeschlossen) */
  pflegekassenExport: adminProcedure
    .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ input }) => {
      const kontrolle = await pruefeLeistungsnachweisAbschluss(input.monat);
      if (!kontrolle.kannAbschliessen) {
        throw new Error(`${kontrolle.offen} Leistungsnachweise sind noch nicht abgeschlossen. Bitte zuerst alle freigeben.`);
      }
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const result = await db.execute(sql`
        SELECT l.id, l.mitarbeiterId,
          CONCAT(m.vorname, ' ', m.nachname) AS mitarbeiterName,
          CONCAT(k.vorname, ' ', k.nachname) AS kundenName,
          l.paragraph, l.stunden, l.betrag, l.status
        FROM leistungen l
        LEFT JOIN mitarbeiter m ON m.id = l.mitarbeiterId
        LEFT JOIN kunden k ON k.id = l.kundenId
        WHERE l.monat = ${input.monat} AND l.geloeschtAt IS NULL
        ORDER BY m.nachname, k.nachname
      `);
      const rows: any[] = (result as any)[0] ?? result;
      const mapped = rows.map((r: any) => ({
        id: Number(r.id), mitarbeiterId: Number(r.mitarbeiterId),
        mitarbeiterName: r.mitarbeiterName ?? "", kundenName: r.kundenName ?? "",
        paragraph: r.paragraph ?? "", stunden: Number(r.stunden ?? 0),
        betrag: Number(r.betrag ?? 0), status: r.status ?? "",
      }));
      return {
        pflegekassenCsv: erstellePflegekassenCsv(input.monat, mapped),
        stundennachweisCsv: erstelleStundennachweisCsv(input.monat, mapped),
      };
    }),

  /** CSV-Export direkt per E-Mail an die Steuerberaterin senden */
  csvAnSteuerberaterinSenden: adminProcedure
    .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ ctx, input }) => {
      const kontrolle = await pruefeLeistungsnachweisAbschluss(input.monat);
      if (!kontrolle.kannAbschliessen) {
        throw new Error(`${kontrolle.offen} Leistungsnachweise sind noch offen. Bitte zuerst alle freigeben.`);
      }
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      // Empfänger laden
      const einstellRows = await db.execute(sql`
        SELECT schluessel, wert FROM systemEinstellungen
        WHERE schluessel IN ('steuerbuero_email', 'steuerbuero_name')
      `);
      const einstellArr: any[] = (einstellRows as any)[0] ?? einstellRows;
      const einstellungen: Record<string, string> = {};
      for (const r of einstellArr) einstellungen[r.schluessel] = r.wert ?? "";

      // Auch aus system_einstellungen prüfen (Fallback)
      if (!einstellungen.steuerbuero_email) {
        const altRows = await db.execute(sql`
          SELECT schluessel, wert FROM system_einstellungen WHERE schluessel = 'steuerbuero_email'
        `);
        const altArr: any[] = (altRows as any)[0] ?? altRows;
        if (altArr[0]?.wert) einstellungen.steuerbuero_email = altArr[0].wert;
      }

      const empfaenger = einstellungen.steuerbuero_email;
      if (!empfaenger) throw new Error("Keine Steuerberaterin-E-Mail hinterlegt. Bitte unter SMTP / E-Mail konfigurieren.");

      // CSV erzeugen
      const result = await db.execute(sql`
        SELECT l.id, l.mitarbeiterId,
          CONCAT(m.vorname, ' ', m.nachname) AS mitarbeiterName,
          CONCAT(k.vorname, ' ', k.nachname) AS kundenName,
          l.paragraph, l.stunden, l.betrag, l.status
        FROM leistungen l
        LEFT JOIN mitarbeiter m ON m.id = l.mitarbeiterId
        LEFT JOIN kunden k ON k.id = l.kundenId
        WHERE l.monat = ${input.monat} AND l.geloeschtAt IS NULL
        ORDER BY m.nachname, k.nachname
      `);
      const rows: any[] = (result as any)[0] ?? result;
      const mapped = rows.map((r: any) => ({
        id: Number(r.id), mitarbeiterId: Number(r.mitarbeiterId),
        mitarbeiterName: r.mitarbeiterName ?? "", kundenName: r.kundenName ?? "",
        paragraph: r.paragraph ?? "", stunden: Number(r.stunden ?? 0),
        betrag: Number(r.betrag ?? 0), status: r.status ?? "",
      }));

      const pflegekassenCsv = erstellePflegekassenCsv(input.monat, mapped);
      const stundennachweisCsv = erstelleStundennachweisCsv(input.monat, mapped);

      const zip = new JSZip();
      zip.file(`Pflegekassen_${input.monat}.csv`, pflegekassenCsv);
      zip.file(`Stundennachweis_MA_${input.monat}.csv`, stundennachweisCsv);
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      const paket = await erstelleSicheresExportpaket({
        db,
        typ: "monatsabschluss",
        referenz: `monat:${input.monat}`,
        dateiname: `Monatsabschluss_${input.monat}.zip`,
        empfaengerEmail: empfaenger,
        erstelltVon: ctx.user.id,
        inhalt: zipBuffer,
        contentType: "application/zip",
      });

      const mailResult = await sendEmail({
        to: empfaenger,
        subject: `Leistungsnachweise & Stundenübersicht ${input.monat} – Seniorenassistenz Bernhardt`,
        html: sichereExportEmail({ titel: "Monatsabschluss", zeitraum: input.monat, abrufUrl: paket.abrufUrl }),
      });
      if (!mailResult.success) {
        throw new Error(mailResult.error ?? "E-Mail konnte nicht gesendet werden. Bitte SMTP-Daten prüfen.");
      }
      await protokolliereSicherenExportversand(db, paket.id);
      return { success: true, empfaenger, anzahl: mapped.length, paketId: paket.id };
    }),
});
