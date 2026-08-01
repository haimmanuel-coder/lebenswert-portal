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
  const label = `16.${String(von.getDate()).padStart(2, "0")}.${monate[von.getMonth()]} – 15.${String(bis.getDate()).padStart(2, "0")}.${monate[bis.getMonth()]} ${bis.getFullYear()}`;

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
    doc.fontSize(18).fillColor("#2d6a2d").text("Lebenswert Betreuung", { align: "center" });
    doc.fontSize(13).fillColor("#333").text("Fahrtennachweise", { align: "center" });
    doc.fontSize(11).fillColor("#555").text(`Abrechnungszeitraum: ${label}`, { align: "center" });
    doc.moveDown(1.5);

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
    doc.fontSize(9).fillColor("#888")
      .text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")} | Lebenswert Betreuung`, { align: "center" });

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
        label = `16.${String(vonD.getDate()).padStart(2, "0")}.${monate[vonD.getMonth()]} – 15.${String(bisD.getDate()).padStart(2, "0")}.${monate[bisD.getMonth()]} ${bisD.getFullYear()}`;
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
    .mutation(async ({ input }) => {
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

      // PDF-Buffer aus S3 holen (via URL)
      let pdfBuffer: Buffer | undefined;
      if (abr.pdfUrl) {
        try {
          const resp = await fetch(`http://localhost:${process.env.PORT ?? 3000}${abr.pdfUrl}`);
          if (resp.ok) pdfBuffer = Buffer.from(await resp.arrayBuffer());
        } catch {
          // PDF-Anhang optional
        }
      }

      // E-Mail senden
      await sendEmail({
        to: empfaengerEmail,
        subject: `Fahrtennachweise ${abr.label} – Lebenswert Betreuung`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px">
            <h2 style="color:#2d6a2d">Fahrtennachweise – Lebenswert Betreuung</h2>
            <p>Sehr geehrte Damen und Herren,</p>
            <p>anbei erhalten Sie die Fahrtennachweise für den Abrechnungszeitraum:</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <tr style="background:#f0f7f0">
                <td style="padding:8px;border:1px solid #ccc"><strong>Zeitraum</strong></td>
                <td style="padding:8px;border:1px solid #ccc">${abr.label}</td>
              </tr>
              <tr>
                <td style="padding:8px;border:1px solid #ccc"><strong>Anzahl Fahrten</strong></td>
                <td style="padding:8px;border:1px solid #ccc">${abr.anzahlFahrten}</td>
              </tr>
              <tr style="background:#f0f7f0">
                <td style="padding:8px;border:1px solid #ccc"><strong>Gesamt km</strong></td>
                <td style="padding:8px;border:1px solid #ccc">${Number(abr.gesamtKm).toFixed(1)} km</td>
              </tr>
              <tr>
                <td style="padding:8px;border:1px solid #ccc"><strong>Gesamt Betrag</strong></td>
                <td style="padding:8px;border:1px solid #ccc"><strong>${Number(abr.gesamtEuro).toFixed(2)} €</strong></td>
              </tr>
            </table>
            <p>Die detaillierte Aufstellung finden Sie im beigefügten PDF.</p>
            <p>Mit freundlichen Grüßen<br><strong>Lebenswert Betreuung</strong></p>
          </div>
        `,
        attachments: pdfBuffer ? [{
          filename: `Fahrtennachweise_${abr.zeitraumVon}_${abr.zeitraumBis}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        }] : [],
      });

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
});
