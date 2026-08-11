/**
 * Heartbeat-Handler: Wöchentlicher Datenbank-Backup (jeden Montag 03:00 UTC)
 * Exportiert Mitarbeiter- und Kundenliste als CSV nach S3 und protokolliert den Lauf.
 */
import { getDb } from "../db";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { sql } from "drizzle-orm";

export async function backupWoechentlichHandler(_req: any, res: any) {
  const startedAt = new Date();
  let backupLaufId: number | null = null;

  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ ok: false, error: "DB nicht verfügbar" });

    // Backup-Lauf starten
    await db.execute(sql`
      INSERT INTO backupLaeufe (typ, status, startedAt, createdAt)
      VALUES ('wochentlich', 'gestartet', NOW(), NOW())
    `);
    const laufRows = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
    backupLaufId = Number((laufRows as any)[0]?.[0]?.id ?? 0);

    const datum = startedAt.toISOString().slice(0, 10);

    // ── Mitarbeiter-CSV ──────────────────────────────────────────────────────
    const maRows = await db.execute(sql`
      SELECT id, vorname, nachname, email, beschaeftigung, urlaubstageJahr, wochenstunden, monatslohn, stundenlohn, aktiv, createdAt
      FROM mitarbeiter ORDER BY nachname ASC, vorname ASC
    `);
    const maData = (maRows as any)[0] as any[];
    const maHeader = 'ID;Vorname;Nachname;E-Mail;Beschäftigung;Urlaubstage/Jahr;Wochenstunden;Monatslohn;Stundenlohn;Aktiv;Angelegt am';
    const maLines = maData.map((m: any) =>
      [m.id, m.vorname, m.nachname, m.email, m.beschaeftigung ?? '', m.urlaubstageJahr ?? '', m.wochenstunden ?? '', m.monatslohn ?? '', m.stundenlohn ?? '', m.aktiv ? 'Ja' : 'Nein', m.createdAt ? new Date(m.createdAt).toLocaleDateString('de-DE') : ''].join(';')
    );
    const maCSV = '\uFEFF' + [maHeader, ...maLines].join('\n');

    // ── Kunden-CSV ───────────────────────────────────────────────────────────
    const kdRows = await db.execute(sql`
      SELECT id, vorname, nachname, strasse, plz, ort, telefon, pflegegrad, paragraph, aktiv, createdAt
      FROM kunden ORDER BY nachname ASC, vorname ASC
    `);
    const kdData = (kdRows as any)[0] as any[];
    const kdHeader = 'ID;Vorname;Nachname;Straße;PLZ;Ort;Telefon;Pflegegrad;Paragraph;Aktiv;Angelegt am';
    const kdLines = kdData.map((k: any) =>
      [k.id, k.vorname, k.nachname, k.strasse ?? '', k.plz ?? '', k.ort ?? '', k.telefon ?? '', k.pflegegrad ?? '', k.paragraph ?? '', k.aktiv ? 'Ja' : 'Nein', k.createdAt ? new Date(k.createdAt).toLocaleDateString('de-DE') : ''].join(';')
    );
    const kdCSV = '\uFEFF' + [kdHeader, ...kdLines].join('\n');

    // ── S3-Upload ────────────────────────────────────────────────────────────
    const maKey = `backups/${datum}/mitarbeiter_${datum}.csv`;
    const kdKey = `backups/${datum}/kunden_${datum}.csv`;
    const [maUpload, kdUpload] = await Promise.all([
      storagePut(maKey, Buffer.from(maCSV, 'utf-8'), 'text/csv'),
      storagePut(kdKey, Buffer.from(kdCSV, 'utf-8'), 'text/csv'),
    ]);

    const gesamtGroesse = Buffer.byteLength(maCSV, 'utf-8') + Buffer.byteLength(kdCSV, 'utf-8');

    // ── Backup-Lauf abschließen ───────────────────────────────────────────────
    if (backupLaufId) {
      await db.execute(sql`
        UPDATE backupLaeufe
        SET status = 'erfolgreich', beendetAt = NOW(), dateiGroesse = ${gesamtGroesse},
            dateiUrl = ${maUpload.url}, details = ${`MA: ${maData.length} Zeilen, Kunden: ${kdData.length} Zeilen`}
        WHERE id = ${backupLaufId}
      `);
    }

    // ── Admin-Benachrichtigung ────────────────────────────────────────────────
    await notifyOwner({
      title: `✅ Wöchentlicher Backup erfolgreich (${datum})`,
      content: `Backup abgeschlossen:\n- Mitarbeiter: ${maData.length} Datensätze (${maUpload.url})\n- Kunden: ${kdData.length} Datensätze (${kdUpload.url})\n- Gesamtgröße: ${(gesamtGroesse / 1024).toFixed(1)} KB`,
    });

    console.log(`[Backup-Wöchentlich] Erfolgreich: ${maData.length} MA, ${kdData.length} Kunden, ${gesamtGroesse} Bytes`);
    return res.json({ ok: true, mitarbeiter: maData.length, kunden: kdData.length, groesse: gesamtGroesse });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Scheduled/BackupWoechentlich]', err);
    if (backupLaufId) {
      try {
        const db = await getDb();
        await db!.execute(sql`UPDATE backupLaeufe SET status = 'fehler', beendetAt = NOW(), fehler = ${msg} WHERE id = ${backupLaufId}`);
      } catch { /* ignore */ }
    }
    await notifyOwner({ title: '❌ Wöchentlicher Backup fehlgeschlagen', content: `Fehler: ${msg}` }).catch(() => {});
    return res.status(500).json({ ok: false, error: msg });
  }
}
