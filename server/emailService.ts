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
