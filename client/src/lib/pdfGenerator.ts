import { jsPDF } from "jspdf";

export interface EinsatzZeile {
  datum: string;
  startzeit?: string | null;
  dauerStunden?: number | string | null;
  anfahrtPauschale?: number | null;
  km?: number | null;
}

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
  kundePflegegradSeit?: string | null;
  // Leistungsnachweis-Daten
  monat: string;
  paragraph: string;
  stunden: number;
  anzahlEinsaetze: number;
  betrag?: number | null;
  status: string;
  createdAt?: Date | string | null;
  // Einzelne Einsatz-Zeilen
  einsaetze?: EinsatzZeile[];
  // Unterschriften
  unterschriftMitarbeiter?: string | null;
  unterschriftKunde?: string | null;
  // Mitarbeiter
  mitarbeiterName: string;
  mitarbeiterPosition?: string | null;
}

const GREEN = "#4a8c3f";
const DARK = "#1a2e1a";
const GRAY = "#6b7280";

function fmtMonat(monat: string): string {
  const [y, m] = monat.split("-");
  const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  return `${monate[parseInt(m) - 1]} ${y}`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  if (!s) return "–";
  const parts = s.split("T")[0].split("-");
  if (parts.length < 3) return s;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function fmtDauer(h: number | string | null | undefined): string {
  if (h == null || h === "") return "–";
  const n = typeof h === "string" ? parseFloat(h) : h;
  if (isNaN(n)) return "–";
  const std = Math.floor(n);
  const min = Math.round((n - std) * 60);
  return min > 0 ? `${std}:${min.toString().padStart(2, "0")} Std.` : `${std}:00 Std.`;
}

export function generateLeistungsnachweisPdf(data: LeistungsnachweisPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 15;
  let y = 0;

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(74, 140, 63);
  doc.rect(0, 0, W, 30, "F");

  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 8, 15, 8, "F");
  doc.setTextColor(74, 140, 63);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("LB", margin + 8, 16.5, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Lebenswert Betreuung", margin + 20, 12);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Leistungsnachweis gemäß SGB XI", margin + 20, 18);
  doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}`, margin + 20, 24);

  doc.setFontSize(7);
  doc.text("IK-Nr.: 460 547 168", W - margin, 12, { align: "right" });
  doc.text("Am Hedtberg 16 · 42389 Wuppertal", W - margin, 18, { align: "right" });
  doc.text("Tel.: 0177-78 51 363", W - margin, 24, { align: "right" });

  y = 38;

  // ── TITEL ─────────────────────────────────────────────────────────────────
  doc.setTextColor(DARK);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Leistungsnachweis", margin, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GREEN);
  doc.text(fmtMonat(data.monat), margin + 55, y);
  y += 4;
  doc.setDrawColor(74, 140, 63);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // ── KUNDEN-STAMMDATEN ─────────────────────────────────────────────────────
  doc.setFillColor(232, 245, 228);
  doc.roundedRect(margin, y, W - 2 * margin, 30, 2, 2, "F");
  doc.setTextColor(GREEN);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("KUNDEN-STAMMDATEN", margin + 3, y + 6);
  doc.setTextColor(DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.kundeVorname} ${data.kundeNachname}`, margin + 3, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const col1 = margin + 3;
  const col2 = margin + 92;
  let ry = y + 20;

  const addKRow = (label: string, value: string, x: number, cy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GRAY);
    doc.text(label + ":", x, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(DARK);
    doc.text(value, x + 26, cy);
  };

  addKRow("Geb.-Datum", fmtDate(data.kundeGeburtsdatum), col1, ry);
  addKRow("Vers.-Nr.", data.kundeVersicherungsnummer || "–", col2, ry);
  ry += 5.5;
  addKRow("Adresse", [data.kundeStrasse, data.kundePlz, data.kundeOrt].filter(Boolean).join(", ") || "–", col1, ry);
  addKRow("Kostenträger", data.kundeKostentraeger || "–", col2, ry);
  y += 36;

  // ── PFLEGEGRAD & PARAGRAPH ────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, W - 2 * margin, 13, 2, 2, "FD");

  doc.setTextColor(DARK);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Pflegegrad:", margin + 3, y + 8.5);
  doc.setFont("helvetica", "normal");
  doc.text(data.kundePflegegrad ? String(data.kundePflegegrad) : "–", margin + 24, y + 8.5);

  doc.setFont("helvetica", "bold");
  doc.text("seit:", margin + 46, y + 8.5);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(data.kundePflegegradSeit), margin + 55, y + 8.5);

  // Paragraph-Optionen
  const paraOpts = [
    { id: "45a", label: "§ 45a", x: margin + 92 },
    { id: "45b", label: "§ 45b", x: margin + 116 },
    { id: "39",  label: "§ 39",  x: margin + 140 },
  ];
  paraOpts.forEach(({ id, label, x }) => {
    const checked = data.paragraph === id;
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.circle(x, y + 6.5, 2.2, "S");
    if (checked) {
      doc.setFillColor(74, 140, 63);
      doc.circle(x, y + 6.5, 1.3, "F");
    }
    doc.setFont("helvetica", checked ? "bold" : "normal");
    doc.setTextColor(checked ? GREEN : DARK);
    doc.setFontSize(8.5);
    doc.text(label, x + 3.5, y + 8.5);
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK);
  doc.setFontSize(8);
  doc.text("Einsatzpauschale: 6,– €", W - margin - 3, y + 8.5, { align: "right" });

  y += 19;

  // ── EINSATZ-TABELLE ───────────────────────────────────────────────────────
  const tableX = margin;
  const tableW = W - 2 * margin;
  // Datum | Uhrzeit | Dauer | Einsatzpauschale | km
  const colW = [35, 24, 24, 36, 21];
  const headers = ["Datum", "Uhrzeit", "Dauer", "Einsatzpauschale", "km"];
  const rowH = 6.5;

  // Header
  doc.setFillColor(74, 140, 63);
  doc.rect(tableX, y, tableW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  let cx = tableX + 2;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 4.5);
    cx += colW[i];
  });
  y += rowH;

  const einsaetze = data.einsaetze || [];
  const displayRows = Math.max(einsaetze.length, 10);

  for (let i = 0; i < displayRows; i++) {
    const e = einsaetze[i];
    doc.setFillColor(i % 2 === 0 ? "#f9fafb" : "#ffffff");
    doc.rect(tableX, y, tableW, rowH, "F");
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

    if (e) {
      doc.setTextColor(DARK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      cx = tableX + 2;
      const cells = [
        fmtDate(e.datum),
        e.startzeit || "–",
        fmtDauer(e.dauerStunden),
        `${(e.anfahrtPauschale ?? 6).toFixed(2)} €`,
        e.km != null ? `${Number(e.km).toFixed(1)}` : "–",
      ];
      cells.forEach((cell, ci) => {
        doc.text(cell, cx, y + 4.5);
        cx += colW[ci];
      });
    }
    y += rowH;
  }

  // Rahmen + vertikale Linien
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(tableX, y - (displayRows + 1) * rowH, tableW, (displayRows + 1) * rowH, "S");
  cx = tableX;
  colW.forEach((w) => {
    cx += w;
    if (cx < tableX + tableW)
      doc.line(cx, y - (displayRows + 1) * rowH, cx, y);
  });

  y += 7;

  // ── ABTRETUNGSHINWEIS (OPTADATA) ──────────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK);
  const abtText = doc.splitTextToSize(
    "Mit der Unterschrift werden die vorweg aufgelisteten, erbrachten Dienstleistungen und die Erstattung der Zahlung an, die von der Lebenswert Betreuung beauftragte \u201eOptadata Gruppe\u201c nach dem jeweiligen, oben genannten Paragrafen bewilligt und abgetreten.",
    tableW
  );
  doc.text(abtText, margin, y);
  y += abtText.length * 4.2 + 3;

  // ── SCHWEIGEPFLICHTENTBINDUNG ─────────────────────────────────────────────
  const schweigText = doc.splitTextToSize(
    "Weiterhin entbinde ich hiermit die Pflegekasse von ihrer Schweigepflicht und erlaube ausdr\u00fccklich, alle relevanten Daten meiner Gesundheit und die damit verbundene Finanzierung betreffend, an die Lebenswert Betreuung mitzuteilen.",
    tableW
  );
  doc.text(schweigText, margin, y);
  y += schweigText.length * 4.2 + 8;

  // ── UNTERSCHRIFTEN ────────────────────────────────────────────────────────
  const sigW = (tableW - 8) / 2;
  const sigH = 20;

  // Zeile 1: Datum + Unterschrift/Stempel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.text("Datum:", margin, y);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(margin + 13, y, margin + 13 + 28, y);
  doc.text("Unterschrift / Stempel:", margin + sigW + 4, y);
  doc.line(margin + sigW + 4 + 36, y, margin + tableW, y);
  y += 4;

  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, sigW, sigH, "S");
  if (data.unterschriftMitarbeiter?.startsWith("data:image")) {
    try { doc.addImage(data.unterschriftMitarbeiter, "PNG", margin + 2, y + 2, sigW - 4, sigH - 4); } catch {}
  } else {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7);
    doc.text("Unterschrift Mitarbeiter", margin + sigW / 2, y + sigH / 2, { align: "center" });
  }
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + sigW + 4, y, sigW, sigH, "S");
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(7);
  doc.text("Stempel", margin + sigW + 4 + sigW / 2, y + sigH / 2, { align: "center" });
  y += sigH + 7;

  // Zeile 2: Datum + Unterschrift Kunde
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.text("Datum:", margin, y);
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + 13, y, margin + 13 + 28, y);
  doc.text("Unterschrift (Kunde):", margin + sigW + 4, y);
  doc.line(margin + sigW + 4 + 33, y, margin + tableW, y);
  y += 4;

  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, tableW, sigH, "S");
  if (data.unterschriftKunde?.startsWith("data:image")) {
    try { doc.addImage(data.unterschriftKunde, "PNG", margin + 2, y + 2, tableW - 4, sigH - 4); } catch {}
  } else {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7);
    doc.text("Unterschrift Kunde", margin + tableW / 2, y + sigH / 2, { align: "center" });
  }
  y += sigH + 3;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(GRAY);
  doc.text("Mit meiner Unterschrift (Kunde) bestätige ich die Richtigkeit der vorweg genannten Dienstleistungen.", margin, y);

  // ── FUSSZEILE ─────────────────────────────────────────────────────────────
  const footerY = 280;
  doc.setFillColor(74, 140, 63);
  doc.rect(0, footerY, W, 17, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Lebenswert Betreuung", margin, footerY + 5);
  doc.setFont("helvetica", "normal");
  doc.text("Am Hedtberg 16 · 42389 Wuppertal", margin, footerY + 10);
  doc.text("IK Nr.: 460 547 168", margin, footerY + 15);

  doc.text("Tel.: 0177-78 51 363", W / 2 - 10, footerY + 5);
  doc.text("Email: Assistenz-bernhardt@web.de", W / 2 - 10, footerY + 10);
  doc.text("www.senioreassistenz-bernhardt.de", W / 2 - 10, footerY + 15);

  doc.text(`Seite 1 von 1`, W - margin, footerY + 5, { align: "right" });
  doc.text(new Date().toLocaleString("de-DE"), W - margin, footerY + 10, { align: "right" });

  // ── SPEICHERN ─────────────────────────────────────────────────────────────
  doc.save(`Leistungsnachweis_${data.kundeNachname}_${data.monat}.pdf`);
}
