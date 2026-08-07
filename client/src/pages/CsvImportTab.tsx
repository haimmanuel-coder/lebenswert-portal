import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CsvRow {
  vorname: string;
  nachname: string;
  email: string;
  passwort: string;
  rolle: string;
  telefon: string;
  beschaeftigungsart: string;
  urlaubstageJahr: string;
  wochenstunden: string;
  monatslohn: string;
  stundenlohn: string;
  _fehler?: string;
}

const CSV_HEADER = ["vorname","nachname","email","passwort","rolle","telefon","beschaeftigungsart","urlaubstageJahr","wochenstunden","monatslohn","stundenlohn"];
const CSV_BEISPIEL = [
  ["Max","Mustermann","max@beispiel.de","Passwort123","mitarbeiter","0171 1234567","minijob","24","0","0","12.50"],
  ["Maria","Musterfrau","maria@beispiel.de","Passwort456","mitarbeiter","0172 9876543","teilzeit","28","20","1200","0"],
];

function downloadTemplate() {
  const rows = [CSV_HEADER, ...CSV_BEISPIEL];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "mitarbeiter_import_vorlage.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // Header-Zeile überspringen
  const dataLines = lines[0].toLowerCase().includes("vorname") ? lines.slice(1) : lines;
  return dataLines.filter(l => l.trim()).map(line => {
    // Semikolon oder Komma als Trennzeichen
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep).map(v => v.replace(/^"|"$/g, "").trim());
    const row: CsvRow = {
      vorname: parts[0] ?? "",
      nachname: parts[1] ?? "",
      email: parts[2] ?? "",
      passwort: parts[3] ?? "",
      rolle: parts[4] ?? "mitarbeiter",
      telefon: parts[5] ?? "",
      beschaeftigungsart: parts[6] ?? "minijob",
      urlaubstageJahr: parts[7] ?? "24",
      wochenstunden: parts[8] ?? "0",
      monatslohn: parts[9] ?? "0",
      stundenlohn: parts[10] ?? "0",
    };
    // Validierung
    const fehler: string[] = [];
    if (!row.vorname) fehler.push("Vorname fehlt");
    if (!row.nachname) fehler.push("Nachname fehlt");
    if (!row.email || !row.email.includes("@")) fehler.push("E-Mail ungültig");
    if (!row.passwort || row.passwort.length < 6) fehler.push("Passwort zu kurz (min. 6)");
    if (!["mitarbeiter","teamleitung","admin"].includes(row.rolle)) row.rolle = "mitarbeiter";
    if (!["minijob","teilzeit","vollzeit"].includes(row.beschaeftigungsart)) row.beschaeftigungsart = "minijob";
    if (fehler.length > 0) row._fehler = fehler.join(", ");
    return row;
  });
}

export default function CsvImportTab() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [ergebnisse, setErgebnisse] = useState<Array<{ email: string; ok: boolean; fehler?: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dateiname, setDateiname] = useState("");
  const [showVerlauf, setShowVerlauf] = useState(false);

  const createMa = (trpc as any).admin.mitarbeiterCreate.useMutation();
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
    const results: Array<{ email: string; ok: boolean; fehler?: string }> = [];
    for (const row of gueltig) {
      try {
        await createMa.mutateAsync({
          vorname: row.vorname,
          nachname: row.nachname,
          email: row.email,
          passwort: row.passwort,
          rolle: row.rolle as any,
          telefon: row.telefon || undefined,
          beschaeftigungsart: row.beschaeftigungsart as any,
          urlaubstageJahr: Number(row.urlaubstageJahr) || 24,
          wochenstunden: Number(row.wochenstunden) || 0,
          monatslohn: Number(row.monatslohn) || 0,
          stundenlohn: Number(row.stundenlohn) || 0,
        });
        results.push({ email: row.email, ok: true });
      } catch (e: any) {
        results.push({ email: row.email, ok: false, fehler: e.message });
      }
    }
    setErgebnisse(results);
    setImporting(false);
    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;
    if (fail === 0) toast.success(`✅ ${ok} Mitarbeiter erfolgreich importiert`);
    else toast.warning(`⚠️ ${ok} OK, ${fail} Fehler`);
    // Protokoll speichern
    try {
      const fehlerDetails = results.filter(r => !r.ok).map(r => `${r.email}: ${r.fehler}`).join("; ");
      await protokollSpeichern.mutateAsync({ dateiname, gesamtZeilen: gueltig.length, erfolgreich: ok, fehlgeschlagen: fail, fehlerDetails: fehlerDetails || undefined });
      refetchProtokolle();
    } catch (_e) {}
  };

  const gueltigCount = rows.filter(r => !r._fehler).length;
  const fehlerCount = rows.filter(r => r._fehler).length;

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>📥 CSV-Massenimport</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          Importiere mehrere Mitarbeiter auf einmal. Lade zuerst die Vorlage herunter, fülle sie aus und lade sie hoch.
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
                    {["Datum","Datei","Gesamt","✓ OK","✗ Fehler","Importiert von"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {protokollListe.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{new Date(p.createdAt).toLocaleString("de-DE")}</td>
                      <td style={{ padding: "6px 10px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.dateiname ?? "–"}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>{p.gesamtZeilen}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", color: "#4a8c3f", fontWeight: 700 }}>{p.erfolgreich}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", color: p.fehlgeschlagen > 0 ? "#dc2626" : "#9ca3af", fontWeight: p.fehlgeschlagen > 0 ? 700 : 400 }}>{p.fehlgeschlagen}</td>
                      <td style={{ padding: "6px 10px" }}>{p.vorname ? `${p.vorname} ${p.nachname}` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schritt 1: Template */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Schritt 1: Vorlage herunterladen</div>
        <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 10px" }}>
          Die Vorlage enthält alle Felder mit zwei Beispielzeilen. Öffne sie in Excel, fülle sie aus und speichere als CSV.
        </p>
        <button onClick={downloadTemplate} style={{ padding: "8px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
                  {["Status","Vorname","Nachname","E-Mail","Rolle","Beschäftigung","Urlaub","Lohn"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ background: row._fehler ? "#fff5f5" : i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "6px 10px" }}>
                      {row._fehler
                        ? <span title={row._fehler} style={{ color: "#dc2626", fontWeight: 700 }}>✗</span>
                        : <span style={{ color: "#4a8c3f", fontWeight: 700 }}>✓</span>}
                    </td>
                    <td style={{ padding: "6px 10px" }}>{row.vorname}</td>
                    <td style={{ padding: "6px 10px" }}>{row.nachname}</td>
                    <td style={{ padding: "6px 10px" }}>{row.email}</td>
                    <td style={{ padding: "6px 10px" }}>{row.rolle}</td>
                    <td style={{ padding: "6px 10px" }}>{row.beschaeftigungsart}</td>
                    <td style={{ padding: "6px 10px" }}>{row.urlaubstageJahr}d</td>
                    <td style={{ padding: "6px 10px" }}>
                      {Number(row.monatslohn) > 0 ? `${row.monatslohn}€/M` : `${row.stundenlohn}€/h`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.some(r => r._fehler) && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#dc2626" }}>
              ⚠️ Fehlerhafte Zeilen werden beim Import übersprungen.
              {rows.filter(r => r._fehler).map((r, i) => (
                <div key={i}>• Zeile {rows.indexOf(r)+1} ({r.email}): {r._fehler}</div>
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
          {importing ? `⏳ Importiere… (${ergebnisse.length}/${gueltigCount})` : `🚀 ${gueltigCount} Mitarbeiter importieren`}
        </button>
      )}

      {/* Ergebnisse */}
      {ergebnisse.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Import-Ergebnis</div>
          {ergebnisse.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: r.ok ? "#f0fdf4" : "#fff5f5", borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: r.ok ? "#4a8c3f" : "#dc2626", fontWeight: 700 }}>{r.ok ? "✓" : "✗"}</span>
              <span style={{ flex: 1 }}>{r.email}</span>
              {r.fehler && <span style={{ color: "#dc2626", fontSize: 11 }}>{r.fehler}</span>}
            </div>
          ))}
          <button onClick={() => { setRows([]); setErgebnisse([]); if (fileRef.current) fileRef.current.value = ""; }} style={{ marginTop: 10, padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
            🔄 Neuer Import
          </button>
        </div>
      )}
    </div>
  );
}
