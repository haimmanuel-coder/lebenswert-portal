import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface KundenCsvRow {
  vorname: string;
  nachname: string;
  strasse: string;
  plz: string;
  ort: string;
  telefon: string;
  geburtsdatum: string;
  pflegegrad: string;
  paragraph: string;
  kostentraeger: string;
  versicherungsnummer: string;
  notizen: string;
  _fehler?: string;
}

const CSV_HEADER = [
  "vorname","nachname","strasse","plz","ort","telefon",
  "geburtsdatum","pflegegrad","paragraph","kostentraeger",
  "versicherungsnummer","notizen"
];

const CSV_BEISPIEL = [
  ["Maria","Mustermann","Musterstraße 12","80331","München","089 1234567",
   "1945-03-15","2","45b","AOK Bayern","A123456789","Rollstuhlfahrerin"],
  ["Hans","Beispiel","Beispielweg 3","80333","München","089 9876543",
   "1938-07-22","3","39","Barmer","B987654321",""],
];

const PARAGRAPH_WERTE = ["45b","45a","39","privat"];

function downloadVorlage() {
  const rows = [CSV_HEADER, ...CSV_BEISPIEL];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "kunden_import_vorlage.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): KundenCsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const dataLines = lines[0].toLowerCase().includes("vorname") ? lines.slice(1) : lines;
  return dataLines.filter(l => l.trim()).map(line => {
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep).map(v => v.replace(/^"|"$/g, "").trim());
    const row: KundenCsvRow = {
      vorname:            parts[0]  ?? "",
      nachname:           parts[1]  ?? "",
      strasse:            parts[2]  ?? "",
      plz:                parts[3]  ?? "",
      ort:                parts[4]  ?? "",
      telefon:            parts[5]  ?? "",
      geburtsdatum:       parts[6]  ?? "",
      pflegegrad:         parts[7]  ?? "2",
      paragraph:          parts[8]  ?? "45b",
      kostentraeger:      parts[9]  ?? "",
      versicherungsnummer:parts[10] ?? "",
      notizen:            parts[11] ?? "",
    };
    const fehler: string[] = [];
    if (!row.vorname) fehler.push("Vorname fehlt");
    if (!row.nachname) fehler.push("Nachname fehlt");
    const pg = Number(row.pflegegrad);
    if (isNaN(pg) || pg < 1 || pg > 5) fehler.push("Pflegegrad muss 1–5 sein");
    if (!PARAGRAPH_WERTE.includes(row.paragraph)) {
      fehler.push(`Paragraph ungültig (erlaubt: ${PARAGRAPH_WERTE.join(", ")})`);
      row.paragraph = "45b";
    }
    if (row._fehler !== undefined) { /* already set */ }
    if (fehler.length > 0) row._fehler = fehler.join(", ");
    return row;
  });
}

export default function KundenCsvImportTab() {
  const [rows, setRows] = useState<KundenCsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [ergebnisse, setErgebnisse] = useState<Array<{ name: string; ok: boolean; fehler?: string }>>([]);
  const [dateiname, setDateiname] = useState("");
  const [showVerlauf, setShowVerlauf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createKunde = (trpc as any).kunden.create.useMutation();
  const protokollSpeichern = (trpc as any).csvImport.protokollSpeichern.useMutation();
  const { data: protokollListe = [], refetch: refetchProtokolle } = (trpc as any).csvImport.protokollListe.useQuery();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDateiname(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setErgebnisse([]);
      toast.info(`${parsed.length} Zeilen eingelesen`);
    };
    reader.readAsText(file, "UTF-8");
  };

  const startImport = async () => {
    const gueltig = rows.filter(r => !r._fehler);
    if (gueltig.length === 0) { toast.error("Keine gültigen Zeilen zum Importieren"); return; }
    setImporting(true);
    const results: Array<{ name: string; ok: boolean; fehler?: string }> = [];
    for (const row of gueltig) {
      const name = `${row.vorname} ${row.nachname}`;
      try {
        await createKunde.mutateAsync({
          vorname: row.vorname,
          nachname: row.nachname,
          adresse: row.strasse ? `${row.strasse}, ${row.plz} ${row.ort}`.trim() : undefined,
          telefon: row.telefon || undefined,
          pflegegrad: Number(row.pflegegrad) || 2,
          paragraph: (PARAGRAPH_WERTE.includes(row.paragraph) ? row.paragraph : "45b") as any,
          versicherungsnummer: row.versicherungsnummer || undefined,
        });
        results.push({ name, ok: true });
      } catch (e: any) {
        results.push({ name, ok: false, fehler: e.message });
      }
    }
    setErgebnisse(results);
    setImporting(false);
    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;
    if (fail === 0) toast.success(`✅ ${ok} Kunden erfolgreich importiert`);
    else toast.warning(`⚠️ ${ok} OK, ${fail} Fehler`);
    // Protokoll speichern (nutzt denselben csvImport Router wie MA-Import)
    try {
      const fehlerDetails = results.filter(r => !r.ok).map(r => `${r.name}: ${r.fehler}`).join("; ");
      await protokollSpeichern.mutateAsync({
        dateiname: `[KUNDEN] ${dateiname}`,
        gesamtZeilen: gueltig.length,
        erfolgreich: ok,
        fehlgeschlagen: fail,
        fehlerDetails: fehlerDetails || undefined,
      });
      refetchProtokolle();
    } catch (_e) {}
  };

  const gueltigCount = rows.filter(r => !r._fehler).length;
  const fehlerCount = rows.filter(r => r._fehler).length;

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>🏠 Kunden-CSV-Import</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          Importiere mehrere Kunden auf einmal. Lade die Vorlage herunter, fülle sie aus und lade sie hoch.
        </p>
      </div>

      {/* Verlauf-Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowVerlauf(v => !v)} style={{ padding: "6px 12px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
          {showVerlauf ? "▲ Verlauf ausblenden" : "📋 Import-Verlauf anzeigen"}
        </button>
      </div>

      {/* Verlauf */}
      {showVerlauf && (
        <div style={{ marginBottom: 20, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📋 Import-Protokoll (letzte 50)</div>
          {protokollListe.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>Noch keine Importe durchgeführt.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Datum","Datei","Gesamt","✓ OK","✗ Fehler"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {protokollListe.filter((p: any) => String(p.dateiname ?? "").startsWith("[KUNDEN]")).map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{new Date(p.createdAt).toLocaleString("de-DE")}</td>
                      <td style={{ padding: "6px 10px" }}>{String(p.dateiname ?? "").replace("[KUNDEN] ","")}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>{p.gesamtZeilen}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", color: "#4a8c3f", fontWeight: 700 }}>{p.erfolgreich}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", color: p.fehlgeschlagen > 0 ? "#dc2626" : "#9ca3af", fontWeight: p.fehlgeschlagen > 0 ? 700 : 400 }}>{p.fehlgeschlagen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schritt 1: Vorlage */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Schritt 1: Vorlage herunterladen</div>
        <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 10px" }}>
          Die Vorlage enthält alle Felder mit 2 Beispielkunden. Öffne in Excel, fülle aus, speichere als CSV (Semikolon-getrennt).
        </p>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
          <strong>Pflichtfelder:</strong> vorname, nachname &nbsp;|&nbsp;
          <strong>Pflegegrad:</strong> 1–5 &nbsp;|&nbsp;
          <strong>Paragraph:</strong> 45b, 45a, 39 oder privat
        </div>
        <button onClick={downloadVorlage} style={{ padding: "8px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ⬇️ Vorlage herunterladen (CSV)
        </button>
      </div>

      {/* Schritt 2: Upload */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Schritt 2: CSV hochladen</div>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          📂 CSV-Datei auswählen
        </button>
        {dateiname && <span style={{ marginLeft: 10, fontSize: 12, color: "#6b7280" }}>{dateiname}</span>}
      </div>

      {/* Vorschau */}
      {rows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Vorschau ({rows.length} Zeilen)</span>
            {gueltigCount > 0 && <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ {gueltigCount} gültig</span>}
            {fehlerCount > 0 && <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✗ {fehlerCount} Fehler</span>}
          </div>
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Status","Vorname","Nachname","Ort","Pflegegrad","Paragraph","Kostenträger"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ background: row._fehler ? "#fff5f5" : i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "6px 10px" }}>
                      {row._fehler
                        ? <span title={row._fehler} style={{ color: "#dc2626", fontWeight: 700, cursor: "help" }}>✗</span>
                        : <span style={{ color: "#4a8c3f", fontWeight: 700 }}>✓</span>}
                    </td>
                    <td style={{ padding: "6px 10px" }}>{row.vorname}</td>
                    <td style={{ padding: "6px 10px" }}>{row.nachname}</td>
                    <td style={{ padding: "6px 10px" }}>{[row.plz, row.ort].filter(Boolean).join(" ") || "–"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>PG {row.pflegegrad}</td>
                    <td style={{ padding: "6px 10px" }}>§{row.paragraph}</td>
                    <td style={{ padding: "6px 10px" }}>{row.kostentraeger || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.some(r => r._fehler) && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#dc2626" }}>
              ⚠️ Fehlerhafte Zeilen werden übersprungen:
              {rows.filter(r => r._fehler).map((r, i) => (
                <div key={i}>• Zeile {rows.indexOf(r)+1} ({r.vorname} {r.nachname}): {r._fehler}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import-Button */}
      {gueltigCount > 0 && ergebnisse.length === 0 && (
        <button
          onClick={startImport}
          disabled={importing}
          style={{ padding: "10px 20px", background: importing ? "#9ca3af" : "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: importing ? "default" : "pointer", width: "100%" }}
        >
          {importing ? `⏳ Importiere… (${ergebnisse.length}/${gueltigCount})` : `🚀 ${gueltigCount} Kunden importieren`}
        </button>
      )}

      {/* Ergebnisse */}
      {ergebnisse.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Import-Ergebnis</div>
          {ergebnisse.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: r.ok ? "#f0fdf4" : "#fff5f5", borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: r.ok ? "#4a8c3f" : "#dc2626", fontWeight: 700 }}>{r.ok ? "✓" : "✗"}</span>
              <span style={{ flex: 1 }}>{r.name}</span>
              {r.fehler && <span style={{ color: "#dc2626", fontSize: 11 }}>{r.fehler}</span>}
            </div>
          ))}
          <button onClick={() => { setRows([]); setErgebnisse([]); setDateiname(""); if (fileRef.current) fileRef.current.value = ""; }} style={{ marginTop: 10, padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
            🔄 Neuer Import
          </button>
        </div>
      )}
    </div>
  );
}
