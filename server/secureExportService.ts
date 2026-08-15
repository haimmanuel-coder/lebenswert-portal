import { sql } from "drizzle-orm";
import { storageGetSignedUrl, storagePut } from "./storage";

type SecureExportInput = {
  db: any;
  typ: "fahrtennachweis" | "monatsabschluss";
  referenz: string;
  dateiname: string;
  empfaengerEmail: string;
  erstelltVon?: number | null;
  bestehenderDateiKey?: string;
  inhalt?: Buffer;
  contentType?: string;
};

/** Erstellt ein protokolliertes S3-Exportpaket und einen zeitlich signierten Abruflink. */
export async function erstelleSicheresExportpaket(input: SecureExportInput) {
  let dateiKey = input.bestehenderDateiKey;
  if (!dateiKey) {
    if (!input.inhalt) throw new Error("Für das sichere Exportpaket fehlt der Dateiinhalt.");
    const upload = await storagePut(
      `sichere-exporte/${input.typ}/${input.referenz}/${input.dateiname}`,
      input.inhalt,
      input.contentType ?? "application/octet-stream",
    );
    dateiKey = upload.key;
  }

  const abrufUrl = await storageGetSignedUrl(dateiKey);
  const result = await input.db.execute(sql`
    INSERT INTO sichereExportpakete
      (typ, referenz, dateiKey, dateiname, empfaengerEmail, erstelltVon, bereitgestelltAt)
    VALUES
      (${input.typ}, ${input.referenz}, ${dateiKey}, ${input.dateiname}, ${input.empfaengerEmail}, ${input.erstelltVon ?? null}, NOW())
  `);
  const insertId = Number((result as any)[0]?.insertId ?? (result as any).insertId ?? 0);
  return { id: insertId, dateiKey, abrufUrl };
}

export async function protokolliereSicherenExportversand(db: any, id: number) {
  if (!id) return;
  await db.execute(sql`
    UPDATE sichereExportpakete SET versendetAt = NOW() WHERE id = ${id}
  `);
}

export function sichereExportEmail(data: { titel: string; zeitraum: string; abrufUrl: string }) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.5">
    <h2 style="color:#2d6a2d">${data.titel}</h2>
    <p>Sehr geehrte Damen und Herren,</p>
    <p>Für den Zeitraum <strong>${data.zeitraum}</strong> wurde ein geschütztes Exportpaket bereitgestellt.</p>
    <p style="margin:24px 0"><a href="${data.abrufUrl}" style="display:inline-block;background:#2d6a2d;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Exportpaket sicher herunterladen</a></p>
    <p style="font-size:12px;color:#6b7280">Der Abruflink ist signiert. Bitte leiten Sie diese E-Mail nicht weiter und speichern Sie die Datei nur in Ihrem geschützten Kanzleisystem.</p>
    <p>Mit freundlichen Grüßen<br><strong>Seniorenassistenz Bernhardt</strong></p>
  </div>`;
}
