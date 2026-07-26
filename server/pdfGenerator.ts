import PDFDocument from "pdfkit";

export interface BesuchsberichtPdfData {
  id: number;
  datum: string | Date;
  kundeVorname: string;
  kundeNachname: string;
  mitarbeiterVorname: string;
  mitarbeiterNachname: string;
  taetigkeiten: string;
  beobachtungen?: string | null;
  besonderheiten?: string | null;
  naechsteSchritte?: string | null;
  status: string;
  dauerMinuten?: number | null;
}

export function generateBesuchsberichtPdf(data: BesuchsberichtPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#1a5c38").text("Lebenswert Betreuung", { align: "center" });
    doc.fontSize(12).fillColor("#555").text("Besuchsbericht", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1a5c38").lineWidth(2).stroke();
    doc.moveDown(0.5);

    const datum = data.datum instanceof Date ? data.datum.toLocaleDateString("de-DE") : data.datum;
    doc.fontSize(10).fillColor("#333");
    doc.text("Bericht-Nr.: " + data.id, { continued: true });
    doc.text("   Datum: " + datum, { align: "right" });
    doc.text("Kunde: " + data.kundeVorname + " " + data.kundeNachname, { continued: true });
    doc.text("   Mitarbeiter: " + data.mitarbeiterVorname + " " + data.mitarbeiterNachname, { align: "right" });
    if (data.dauerMinuten) {
      doc.text("Dauer: " + Math.floor(data.dauerMinuten / 60) + "h " + (data.dauerMinuten % 60) + "min");
    }
    doc.text("Status: " + data.status.toUpperCase());
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor("#1a5c38").text("Durchgefuehrte Taetigkeiten:");
    doc.fontSize(10).fillColor("#333").text(data.taetigkeiten || "-");
    doc.moveDown(0.5);

    if (data.beobachtungen) {
      doc.fontSize(11).fillColor("#1a5c38").text("Beobachtungen:");
      doc.fontSize(10).fillColor("#333").text(data.beobachtungen);
      doc.moveDown(0.5);
    }
    if (data.besonderheiten) {
      doc.fontSize(11).fillColor("#1a5c38").text("Besonderheiten:");
      doc.fontSize(10).fillColor("#333").text(data.besonderheiten);
      doc.moveDown(0.5);
    }
    if (data.naechsteSchritte) {
      doc.fontSize(11).fillColor("#1a5c38").text("Naechste Schritte:");
      doc.fontSize(10).fillColor("#333").text(data.naechsteSchritte);
      doc.moveDown(0.5);
    }

    doc.moveDown(2);
    const yLine = doc.y;
    doc.moveTo(50, yLine).lineTo(200, yLine).strokeColor("#333").lineWidth(1).stroke();
    doc.fontSize(9).fillColor("#555").text("Unterschrift Mitarbeiter", 50, yLine + 5);
    doc.moveTo(350, yLine).lineTo(500, yLine).strokeColor("#333").lineWidth(1).stroke();
    doc.text("Unterschrift Kunde", 350, yLine + 5);

    doc.fontSize(8).fillColor("#999").text(
      "Erstellt am " + new Date().toLocaleDateString("de-DE") + " | Lebenswert Betreuung GmbH | DSGVO-konform",
      50, 780, { align: "center", width: 495 }
    );
    doc.end();
  });
}
