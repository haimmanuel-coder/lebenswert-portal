import { jsPDF } from "jspdf";

export interface LeistungsnachweisPdfData {
  // Kunden-Stammdaten
  kundeVorname: string;
  kundeNachname: string;
  kundeGeburtsdatum?: string | null;
  kundeStrasse?: string | null;
  kundePlz?: string | null;
  kundeOrt?: string | null;
  kundeVersicherungsnummer?: string | null;
  kundeKostentraeger?: string | null;
  kundePflegegrad?: number | null;

  // Leistungsnachweis-Daten
  monat: string; // z.B. "2024-06"
  paragraph: string; // "45b" | "45a" | "39"
  stunden: number;
  anzahlEinsaetze: number;
  betrag?: number | null;
  status: string;
  createdAt?: Date | string | null;

  // Unterschriften
  unterschriftMitarbeiter?: string | null; // base64 data URL
  unterschriftKunde?: string | null; // base64 data URL

  // Mitarbeiter
  mitarbeiterName: string;
  mitarbeiterPosition?: string | null;
}

const GREEN = "#4a8c3f";
const DARK = "#1a2e1a";
const GRAY = "#6b7280";
const LIGHT_GREEN = "#e8f5e4";

function fmtMonat(monat: string): string {
  const [y, m] = monat.split("-");
  const monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${monate[parseInt(m) - 1]} ${y}`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  if (!s) return "–";
  const [y, mo, day] = s.split("T")[0].split("-");
  return `${day}.${mo}.${y}`;
}

function paragraphLabel(p: string): string {
  if (p === "45b") return "§ 45b SGB XI – Entlastungsleistungen";
  if (p === "45a") return "§ 45a SGB XI – Betreuungsleistungen";
  if (p === "39") return "§ 39 SGB XI – Verhinderungspflege";
  return `§ ${p} SGB XI`;
}

export function generateLeistungsnachweisPdf(data: LeistungsnachweisPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 18;
  let y = 0;

  // ── HEADER ────────────────────────────────────────────
  // Grüner Header-Balken
  doc.setFillColor(74, 140, 63);
  doc.rect(0, 0, W, 38, "F");

  // Logo-Kreis
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 10, 19, 10, "F");
  doc.setTextColor(74, 140, 63);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LB", margin + 10, 20.5, { align: "center" });

  // Firmenname
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Lebenswert Betreuung", margin + 24, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Mitarbeiter-Portal · Leistungsnachweis", margin + 24, 22);

  // Datum rechts
  doc.setFontSize(8);
  doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}`, W - margin, 16, { align: "right" });
  doc.text(`Dokument-Nr: LNW-${Date.now().toString().slice(-8)}`, W - margin, 22, { align: "right" });

  y = 46;

  // ── TITEL ─────────────────────────────────────────────
  doc.setTextColor(DARK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Leistungsnachweis", margin, y);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GREEN);
  doc.text(fmtMonat(data.monat), margin + 62, y);
  y += 6;

  // Trennlinie
  doc.setDrawColor(74, 140, 63);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ── KUNDEN-STAMMDATEN ─────────────────────────────────
  doc.setFillColor(232, 245, 228);
  doc.roundedRect(margin, y, W - 2 * margin, 42, 3, 3, "F");

  doc.setTextColor(74, 140, 63);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("KUNDEN-STAMMDATEN", margin + 4, y + 7);

  doc.setTextColor(DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.kundeVorname} ${data.kundeNachname}`, margin + 4, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(GRAY);

  const col1x = margin + 4;
  const col2x = margin + 90;
  let ry = y + 22;

  const addRow = (label: string, value: string, x: number, cy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GRAY);
    doc.text(label + ":", x, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(DARK);
    doc.text(value, x + 32, cy);
  };

  addRow("Geburtsdatum", fmtDate(data.kundeGeburtsdatum), col1x, ry);
  addRow("Pflegegrad", data.kundePflegegrad ? `Pflegegrad ${data.kundePflegegrad}` : "–", col2x, ry);
  ry += 6;
  addRow("Adresse", [data.kundeStrasse, data.kundePlz, data.kundeOrt].filter(Boolean).join(", ") || "–", col1x, ry);
  addRow("Vers.-Nr.", data.kundeVersicherungsnummer || "–", col2x, ry);
  ry += 6;
  addRow("Kostenträger", data.kundeKostentraeger || "–", col1x, ry);

  y += 50;

  // ── LEISTUNGS-DETAILS ─────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, W - 2 * margin, 50, 3, 3, "FD");

  doc.setTextColor(74, 140, 63);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LEISTUNGS-DETAILS", margin + 4, y + 7);

  // Paragraph-Badge
  doc.setFillColor(74, 140, 63);
  doc.roundedRect(margin + 4, y + 11, 80, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(paragraphLabel(data.paragraph), margin + 44, y + 16.5, { align: "center" });

  doc.setTextColor(DARK);
  doc.setFontSize(10);
  let dy = y + 26;

  const addDetailRow = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY);
    doc.text(label, margin + 4, dy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK);
    doc.text(value, margin + 60, dy);
    dy += 7;
  };

  addDetailRow("Abrechnungsmonat:", fmtMonat(data.monat));
  addDetailRow("Anzahl Einsätze:", `${data.anzahlEinsaetze} Einsätze`);
  addDetailRow("Geleistete Stunden:", `${data.stunden.toFixed(1)} Stunden`);
  if (data.betrag) {
    addDetailRow("Abrechnungsbetrag:", `${data.betrag.toFixed(2)} €`);
  }

  // Status-Badge
  const statusColor = data.status === "eingereicht" ? "#2a9d8f" : data.status === "abgerechnet" ? "#4a8c3f" : "#e9c46a";
  const statusText = data.status === "eingereicht" ? "Eingereicht" : data.status === "abgerechnet" ? "Abgerechnet" : "Offen";
  doc.setFillColor(statusColor);
  doc.roundedRect(W - margin - 32, y + 11, 30, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, W - margin - 17, y + 16.5, { align: "center" });

  y += 58;

  // ── UNTERSCHRIFTEN ────────────────────────────────────
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, W - 2 * margin, 52, 3, 3, "FD");

  doc.setTextColor(74, 140, 63);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("UNTERSCHRIFTEN", margin + 4, y + 7);

  const sigW = (W - 2 * margin - 10) / 2;
  const sigH = 30;
  const sig1x = margin + 4;
  const sig2x = margin + sigW + 10;
  const sigY = y + 12;

  // Unterschrift-Boxen
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(sig1x, sigY, sigW - 4, sigH);
  doc.rect(sig2x, sigY, sigW - 4, sigH);

  // Unterschrift-Bilder einfügen
  if (data.unterschriftMitarbeiter && data.unterschriftMitarbeiter.startsWith("data:image")) {
    try {
      doc.addImage(data.unterschriftMitarbeiter, "PNG", sig1x + 2, sigY + 2, sigW - 8, sigH - 4);
    } catch {}
  } else {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text("Keine Unterschrift", sig1x + (sigW - 4) / 2, sigY + sigH / 2, { align: "center" });
  }

  if (data.unterschriftKunde && data.unterschriftKunde.startsWith("data:image")) {
    try {
      doc.addImage(data.unterschriftKunde, "PNG", sig2x + 2, sigY + 2, sigW - 8, sigH - 4);
    } catch {}
  } else {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text("Keine Unterschrift", sig2x + (sigW - 4) / 2, sigY + sigH / 2, { align: "center" });
  }

  // Labels
  doc.setTextColor(GRAY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Mitarbeiter: ${data.mitarbeiterName}`, sig1x, sigY + sigH + 5);
  doc.text(`Kunde: ${data.kundeVorname} ${data.kundeNachname}`, sig2x, sigY + sigH + 5);

  y += 60;

  // ── STEMPEL / FOOTER ──────────────────────────────────
  // Grüner Footer-Balken
  const footerY = 280;
  doc.setFillColor(74, 140, 63);
  doc.rect(0, footerY, W, 17, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Lebenswert Betreuung · Mitarbeiter-Portal", margin, footerY + 6);
  doc.text("Dieses Dokument wurde elektronisch erstellt und ist ohne Stempel gültig.", margin, footerY + 11);
  doc.text(`Seite 1 von 1`, W - margin, footerY + 6, { align: "right" });
  doc.text(new Date().toLocaleString("de-DE"), W - margin, footerY + 11, { align: "right" });

  // Stempel-Kreis (dekorativ)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.circle(W / 2, footerY + 8.5, 6);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("LB", W / 2, footerY + 9.5, { align: "center" });

  // ── SPEICHERN ─────────────────────────────────────────
  const filename = `Leistungsnachweis_${data.kundeNachname}_${data.monat}.pdf`;
  doc.save(filename);
}
