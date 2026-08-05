import { jsPDF } from "jspdf";

// ─── Farben & Konstanten ──────────────────────────────────────────────────────
const GREEN = "#4a8c3f";
const DARK = "#1a2e1a";
const GRAY = "#6b7280";
const LIGHT_GREEN = "#e8f5e4";

// ─── Themen-Texte ─────────────────────────────────────────────────────────────
const THEMEN_LABELS: Record<string, string> = {
  notfall_erste_hilfe: "Verhalten in Notfällen & Erste Hilfe",
  hygiene_desinfektion: "Hygiene- und Desinfektionsmaßnahmen",
  ergonomie_heben_tragen: "Ergonomisches Heben, Tragen und Bewegen von Pflegebedürftigen",
  deeskalation_demenz: "Deeskalation bei herausforderndem Verhalten / Demenz",
  verkehrssicherheit: "Verkehrssicherheit bei Dienstfahrten",
  psa_verwendung: "Verwendung persönlicher Schutzausrüstung (PSA)",
  alleinarbeit_schutz: "Schutz bei Alleinarbeit im häuslichen Umfeld",
  biostoff_infektionsschutz: "Biostoff- und Infektionsschutz",
  sonstiges: "Sonstiges",
};

const THEMEN_INHALTE: Record<string, string[]> = {
  notfall_erste_hilfe: [
    "Notrufnummern (112 Rettungsdienst, 110 Polizei) und deren korrekte Nutzung",
    "Erste-Hilfe-Maßnahmen: stabile Seitenlage, Herzdruckmassage, Wundversorgung",
    "Standort und Handhabung des Erste-Hilfe-Kastens",
    "Verhalten bei Sturz, Ohnmacht oder akuten Erkrankungen des Kunden",
    "Dokumentationspflicht bei Notfällen und Meldewege",
  ],
  hygiene_desinfektion: [
    "Händehygiene: Waschen, Desinfizieren, Handschuhe anlegen/ablegen",
    "Umgang mit Körperflüssigkeiten und kontaminierten Materialien",
    "Entsorgung von Einwegmaterialien (Handschuhe, Masken, Schutzkleidung)",
    "Reinigung und Desinfektion von Arbeitsmitteln und Flächen",
    "Persönliche Schutzausrüstung (PSA): Wann und wie einsetzen?",
  ],
  ergonomie_heben_tragen: [
    "Rückengerechtes Heben und Tragen: Knie beugen, Rücken gerade",
    "Einsatz von Hilfsmitteln: Rutschbrett, Hebeband, Pflegebett-Verstellung",
    "Lagerungstechniken zur Dekubitusprophylaxe",
    "Körperhaltung bei der Körperpflege und beim Transfer",
    "Pausen und Erholungszeiten zur Belastungsreduktion",
  ],
  deeskalation_demenz: [
    "Grundlagen der Kommunikation mit demenzerkrankten Personen",
    "Deeskalationstechniken bei Aggression und Unruhe",
    "Validation nach Naomi Feil: Einfühlsames Verstehen",
    "Grenzen setzen und Selbstschutz bei übergriffigem Verhalten",
    "Meldewege und Dokumentation bei kritischen Situationen",
  ],
  verkehrssicherheit: [
    "Fahrtüchtigkeit: Alkohol, Medikamente, Müdigkeit",
    "Verhalten bei Unfällen: Absicherung, Notruf, Erste Hilfe",
    "Fahrzeugcheck vor Dienstantritt (Reifen, Licht, Bremsen)",
    "Nutzung von Navigationsgeräten und Mobiltelefon im Straßenverkehr",
    "Dokumentation von Dienstfahrten im Fahrtenbuch",
  ],
  psa_verwendung: [
    "Arten der PSA: Einmalhandschuhe, FFP2-Masken, Schutzkittel, Schutzbrille",
    "Korrekte Anlege- und Ablegetechnik (Kontaminationsvermeidung)",
    "Aufbewahrung und Entsorgung von PSA",
    "Wann ist welche PSA vorgeschrieben? (Pflegesituationen, Infektionsrisiko)",
    "Hautschutz und Hautpflege bei häufigem Handschuhgebrauch",
  ],
  alleinarbeit_schutz: [
    "Risiken der Alleinarbeit im häuslichen Umfeld",
    "Nutzung des Alleinarbeits-Check-in/Check-out-Systems",
    "Notfallkontakte und Eskalationskette bei Ausbleiben des Check-outs",
    "Persönliche Sicherheitsmaßnahmen (Handy, Notruf-App)",
    "Verhalten bei Bedrohungssituationen (Verlassen der Situation, Notruf)",
  ],
  biostoff_infektionsschutz: [
    "Biostoffverordnung (BioStoffV): Grundlagen und Pflichten",
    "Übertragungswege von Infektionskrankheiten (Tröpfchen, Kontakt, Aerosole)",
    "Schutzmaßnahmen bei bekannten Infektionskrankheiten des Kunden",
    "Nadelstichverletzungen: Sofortmaßnahmen und Meldepflicht",
    "Impfempfehlungen für Pflegepersonal (Hepatitis B, Influenza, COVID-19)",
  ],
  sonstiges: [
    "Inhalte gemäß betrieblicher Unterweisung",
    "Sicherheitsrelevante Informationen für den Arbeitsbereich",
    "Hinweise auf geltende Vorschriften und Betriebsanweisungen",
  ],
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const s = typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ─── Daten-Interface ──────────────────────────────────────────────────────────
export interface UnterweisungNachweisData {
  mitarbeiterVorname: string;
  mitarbeiterNachname: string;
  mitarbeiterEmail?: string | null;
  thema: string;
  unterweisungsDatum: string | Date;
  naechsteFaelligkeit?: string | Date | null;
  bestaetigt: boolean;
  bestaetigtAm?: string | Date | null;
  inhalt?: string | null;
  durchgefuehrtVon?: string | null;
}

// ─── PDF-Generator ────────────────────────────────────────────────────────────
export function generateUnterweisungsNachweis(data: UnterweisungNachweisData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const MARGIN = 20;
  const CONTENT_W = W - 2 * MARGIN;

  const [gr, gg, gb] = hexToRgb(GREEN);
  const [dr, dg, db] = hexToRgb(DARK);
  const [lgr, lgg, lgb] = hexToRgb(LIGHT_GREEN);

  let y = 0;

  // ── Kopfzeile (grüner Balken) ─────────────────────────────────────────────
  doc.setFillColor(gr, gg, gb);
  doc.rect(0, 0, W, 28, "F");

  // Firmenname
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Lebenswert Betreuung", MARGIN, 12);

  // Untertitel
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Ambulante Betreuung & Alltagsbegleitung", MARGIN, 18);

  // Rechts: Dokument-Typ
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("UNTERWEISUNGSNACHWEIS", W - MARGIN, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Arbeitssicherheit & Gesundheitsschutz`, W - MARGIN, 18, { align: "right" });

  y = 36;

  // ── Thema-Box ─────────────────────────────────────────────────────────────
  doc.setFillColor(lgr, lgg, lgb);
  doc.setDrawColor(gr, gg, gb);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, "FD");

  doc.setTextColor(dr, dg, db);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("THEMA DER UNTERWEISUNG", MARGIN + 4, y + 6);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(gr, gg, gb);
  const themaLabel = THEMEN_LABELS[data.thema] ?? data.thema;
  doc.text(themaLabel, MARGIN + 4, y + 15);

  y += 30;

  // ── Zwei-Spalten-Info: Mitarbeiter + Datum ────────────────────────────────
  const COL_W = (CONTENT_W - 6) / 2;

  // Linke Spalte: Mitarbeiter
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, COL_W, 32, 2, 2, "FD");

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("MITARBEITER", MARGIN + 4, y + 6);

  doc.setTextColor(dr, dg, db);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.mitarbeiterVorname} ${data.mitarbeiterNachname}`, MARGIN + 4, y + 14);

  if (data.mitarbeiterEmail) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.mitarbeiterEmail, MARGIN + 4, y + 21);
  }

  // Rechte Spalte: Datum
  const col2X = MARGIN + COL_W + 6;
  doc.setFillColor(248, 250, 248);
  doc.roundedRect(col2X, y, COL_W, 32, 2, 2, "FD");

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DATUM DER UNTERWEISUNG", col2X + 4, y + 6);

  doc.setTextColor(dr, dg, db);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(fmtDate(data.unterweisungsDatum), col2X + 4, y + 16);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  if (data.naechsteFaelligkeit) {
    doc.text(`Nächste Fälligkeit: ${fmtDate(data.naechsteFaelligkeit)}`, col2X + 4, y + 24);
  }

  y += 40;

  // ── Inhalte der Unterweisung ──────────────────────────────────────────────
  doc.setTextColor(dr, dg, db);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Inhalte der Unterweisung", MARGIN, y);

  // Trennlinie
  doc.setDrawColor(gr, gg, gb);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_W, y + 2);
  y += 8;

  const inhalte = THEMEN_INHALTE[data.thema] ?? ["Inhalte gemäß betrieblicher Unterweisung"];

  // Zusätzlicher individueller Inhalt
  const extraInhalt = data.inhalt?.trim();

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(dr, dg, db);

  inhalte.forEach((punkt, i) => {
    // Bullet-Punkt
    doc.setFillColor(gr, gg, gb);
    doc.circle(MARGIN + 2, y - 1.2, 1, "F");

    const lines = doc.splitTextToSize(punkt, CONTENT_W - 8) as string[];
    doc.text(lines, MARGIN + 6, y);
    y += lines.length * 5 + 2;

    if (i < inhalte.length - 1 && y > 240) {
      doc.addPage();
      y = 20;
    }
  });

  // Individueller Inhalt
  if (extraInhalt) {
    y += 2;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dr, dg, db);
    doc.text("Zusätzliche Hinweise:", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const extraLines = doc.splitTextToSize(extraInhalt, CONTENT_W) as string[];
    doc.text(extraLines, MARGIN, y);
    y += extraLines.length * 5 + 4;
  }

  y += 6;

  // ── Bestätigungs-Box ──────────────────────────────────────────────────────
  if (data.bestaetigt && data.bestaetigtAm) {
    doc.setFillColor(lgr, lgg, lgb);
    doc.setDrawColor(gr, gg, gb);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "FD");

    doc.setTextColor(gr, gg, gb);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`✓ Unterweisung digital bestätigt am ${fmtDate(data.bestaetigtAm)}`, MARGIN + 4, y + 9);
    y += 22;
  }

  // ── Unterschriftszeilen ───────────────────────────────────────────────────
  // Sicherstellen, dass genug Platz für Unterschriften
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  y = Math.max(y, 200); // Unterschriften immer im unteren Bereich

  // Trennlinie
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 8;

  doc.setTextColor(dr, dg, db);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bestätigung durch Unterschrift", MARGIN, y);
  y += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const bestaetText = "Ich bestätige hiermit, dass ich an der oben genannten Unterweisung teilgenommen habe und die Inhalte verstanden habe.";
  const bestaetLines = doc.splitTextToSize(bestaetText, CONTENT_W) as string[];
  doc.text(bestaetLines, MARGIN, y);
  y += bestaetLines.length * 5 + 10;

  // Zwei Unterschriftsfelder nebeneinander
  const SIG_W = (CONTENT_W - 10) / 2;
  const SIG_H = 28;

  // Linkes Feld: Mitarbeiter
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, SIG_W, SIG_H);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Unterschrift Mitarbeiter/in", MARGIN + 2, y + SIG_H - 3);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(dr, dg, db);
  doc.text(`${data.mitarbeiterVorname} ${data.mitarbeiterNachname}`, MARGIN + 2, y + SIG_H - 9);

  // Rechtes Feld: Durchführender / Vorgesetzte
  const sig2X = MARGIN + SIG_W + 10;
  doc.setDrawColor(180, 180, 180);
  doc.rect(sig2X, y, SIG_W, SIG_H);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Unterschrift Vorgesetzte/r / Durchführende/r", sig2X + 2, y + SIG_H - 3);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(dr, dg, db);
  doc.text("Lebenswert Betreuung", sig2X + 2, y + SIG_H - 9);

  y += SIG_H + 8;

  // Datum-Zeile
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Ort, Datum: ___________________________`, MARGIN, y);
  doc.text(`Ort, Datum: ___________________________`, sig2X, y);

  // ── Fußzeile ──────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footerY = 287;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, footerY - 4, W - MARGIN, footerY - 4);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Lebenswert Betreuung · Ambulante Betreuung & Alltagsbegleitung", MARGIN, footerY);
    doc.text(`Seite ${p} / ${pageCount}`, W - MARGIN, footerY, { align: "right" });
    doc.text(`Erstellt: ${fmtDate(new Date().toISOString())}`, W / 2, footerY, { align: "center" });
  }

  // ── Speichern ─────────────────────────────────────────────────────────────
  const dateiname = `Unterweisungsnachweis_${data.mitarbeiterNachname}_${data.thema}_${fmtDate(data.unterweisungsDatum).replace(/\./g, "-")}.pdf`;
  doc.save(dateiname);
}
