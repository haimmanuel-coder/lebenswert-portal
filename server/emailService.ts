import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "portal@lebenswert-betreuung.de";

    if (!host || !user || !pass) {
      console.warn("[Email] SMTP nicht konfiguriert – E-Mail nicht gesendet.");
      return { success: false, error: "SMTP nicht konfiguriert" };
    }

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, attachments: opts.attachments });
    return { success: true };
  } catch (e: any) {
    console.error("[Email] Fehler:", e.message);
    return { success: false, error: e.message };
  }
}

export function buildBesuchsberichtEmail(data: {
  kundeVorname: string; kundeNachname: string;
  mitarbeiterVorname: string; mitarbeiterNachname: string;
  datum: string; berichtId: number;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a5c38;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Lebenswert Betreuung</h2>
        <p style="margin:4px 0 0">Besuchsbericht #${data.berichtId}</p>
      </div>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0">
        <p>Sehr geehrte Damen und Herren,</p>
        <p>im Anhang finden Sie den Besuchsbericht vom <strong>${data.datum}</strong>
           für <strong>${data.kundeVorname} ${data.kundeNachname}</strong>,
           erstellt von <strong>${data.mitarbeiterVorname} ${data.mitarbeiterNachname}</strong>.</p>
        <p>Bei Fragen wenden Sie sich bitte an Ihr Lebenswert-Team.</p>
        <p style="margin-top:24px">Mit freundlichen Grüßen<br><strong>Lebenswert Betreuung GmbH</strong></p>
      </div>
      <div style="background:#e8f5e9;padding:10px;font-size:11px;color:#555;border-radius:0 0 8px 8px">
        Diese E-Mail wurde automatisch generiert. | DSGVO-konform verarbeitet.
      </div>
    </div>`;
}

export function buildSteuerberaterEmail(data: {
  vorname: string; nachname: string; email: string;
  telefon?: string; rolle: string; beschaeftigungsart?: string;
  urlaubstageJahr?: number; wochenstunden?: number;
  monatslohn?: number; stundenlohn?: number;
  einstellungsdatum: string; firmaName?: string;
}): string {
  const beschMap: Record<string, string> = { minijob: "Minijob (450€-Basis)", teilzeit: "Teilzeit", vollzeit: "Vollzeit" };
  const rolleMap: Record<string, string> = { mitarbeiter: "Mitarbeiter/in", teamleitung: "Teamleitung", admin: "Administrator", buchhaltung: "Buchhaltung" };
  const firma = data.firmaName ?? "Lebenswert Betreuung";
  const row = (label: string, value: string, bg = "#fff") =>
    `<tr style="background:${bg}"><td style="padding:8px 14px;color:#6b7280;width:42%;border-bottom:1px solid #f3f4f6">${label}</td><td style="padding:8px 14px;font-weight:600;border-bottom:1px solid #f3f4f6">${value}</td></tr>`;
  const header = (title: string) =>
    `<tr><th colspan="2" style="padding:10px 14px;text-align:left;font-size:14px;background:#1a5c38;color:#fff">${title}</th></tr>`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff">
      <div style="background:#1a5c38;color:#fff;padding:24px 28px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">${firma}</h2>
        <p style="margin:6px 0 0;opacity:.85;font-size:14px">Neue Mitarbeitermeldung – Knappschaft-Anmeldung</p>
      </div>
      <div style="padding:24px 28px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0 0 20px;font-size:14px;color:#374151">
          Sehr geehrte Damen und Herren,<br><br>
          wir teilen Ihnen mit, dass ein neuer Mitarbeiter eingestellt wurde. Bitte melden Sie die Person
          entsprechend bei der Knappschaft an. Alle relevanten Daten finden Sie nachfolgend.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          ${header("👤 Persönliche Daten")}
          ${row("Vorname", data.vorname)}
          ${row("Nachname", data.nachname, "#f9fafb")}
          ${row("E-Mail", data.email)}
          ${row("Telefon", data.telefon || "–", "#f9fafb")}
          ${header("💼 Beschäftigungsdaten")}
          ${row("Einstellungsdatum", data.einstellungsdatum)}
          ${row("Beschäftigungsart", beschMap[data.beschaeftigungsart ?? ""] ?? data.beschaeftigungsart ?? "–", "#f9fafb")}
          ${row("Position / Rolle", rolleMap[data.rolle] ?? data.rolle)}
          ${row("Wochenstunden", data.wochenstunden ? data.wochenstunden + " Std./Woche" : "–", "#f9fafb")}
          ${row("Monatslohn (brutto)", data.monatslohn ? data.monatslohn.toFixed(2) + " €" : "–")}
          ${row("Stundenlohn (brutto)", data.stundenlohn ? data.stundenlohn.toFixed(2) + " €/Std." : "–", "#f9fafb")}
          ${row("Urlaubstage/Jahr", String(data.urlaubstageJahr ?? 24) + " Tage")}
        </table>
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e;margin-bottom:16px">
          ⚠️ <strong>Hinweis:</strong> Bitte prüfen Sie alle Angaben vor der Meldung und fordern Sie ggf. fehlende Unterlagen (Sozialversicherungsausweis, Steuer-ID) direkt beim Mitarbeiter an.
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0">
          Diese E-Mail wurde automatisch vom Mitarbeiter-Portal von ${firma} generiert.<br>
          Einstellungsdatum: ${data.einstellungsdatum}
        </p>
      </div>
    </div>`;
}
