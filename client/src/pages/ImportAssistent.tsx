/**
 * ImportAssistent.tsx
 * Aufgaben A18 + A19: Excel/CSV-Import für Kunden + Änderungsprotokoll
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface KundeImportRow {
  vorname: string;
  nachname: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  pflegegrad?: number;
  paragraph?: string;
  kostentraeger?: string;
  versicherungsnummer?: string;
  budget45b?: number;
  budget45a?: number;
  budget39?: number;
}

// ─── Spalten-Mapping (Excel-Header → DB-Feld) ─────────────────────────────────
const SPALTEN_MAP: Record<string, keyof KundeImportRow> = {
  "vorname": "vorname", "Vorname": "vorname",
  "nachname": "nachname", "Nachname": "nachname",
  "strasse": "strasse", "Straße": "strasse", "Strasse": "strasse",
  "plz": "plz", "PLZ": "plz",
  "ort": "ort", "Ort": "ort",
  "telefon": "telefon", "Telefon": "telefon",
  "pflegegrad": "pflegegrad", "Pflegegrad": "pflegegrad", "PG": "pflegegrad",
  "paragraph": "paragraph", "Paragraph": "paragraph", "§": "paragraph",
  "kostentraeger": "kostentraeger", "Kostenträger": "kostentraeger",
  "versicherungsnummer": "versicherungsnummer", "Versicherungsnr.": "versicherungsnummer",
  "budget45b": "budget45b", "Budget §45b": "budget45b", "45b": "budget45b",
  "budget45a": "budget45a", "Budget §45a": "budget45a", "45a": "budget45a",
  "budget39": "budget39", "Budget §39": "budget39", "39": "budget39",
};

export default function ImportAssistent() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [vorschau, setVorschau] = useState<KundeImportRow[]>([]);
  const [dateiname, setDateiname] = useState("");
  const [fehler, setFehler] = useState<string[]>([]);
  const [ergebnis, setErgebnis] = useState<{ anzahlNeu: number; anzahlAktualisiert: number; anzahlFehler: number; fehlerDetails: string[] } | null>(null);

  const { data: protokolle, refetch: refetchProtokolle } = trpc.import.protokolle.useQuery();
  const { data: aenderungen } = trpc.import.aenderungsprotokoll.useQuery({ limit: 200 });

  const importMutation = trpc.import.importKunden.useMutation({
    onSuccess: (data) => {
      setErgebnis(data);
      refetchProtokolle();
      toast.success(`Import abgeschlossen: ${data.anzahlNeu} neu, ${data.anzahlAktualisiert} aktualisiert, ${data.anzahlFehler} Fehler`);
    },
    onError: (err) => toast.error(`Import fehlgeschlagen: ${err.message}`),
  });

  // ─── Datei lesen ─────────────────────────────────────────────────────────────
  function handleDatei(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDateiname(file.name);
    setFehler([]);
    setErgebnis(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { raw: false }) as Record<string, string>[];

        const mapped: KundeImportRow[] = [];
        const validierungsFehler: string[] = [];

        rows.forEach((row, idx) => {
          const k: Partial<KundeImportRow> = {};
          for (const [header, wert] of Object.entries(row)) {
            const dbFeld = SPALTEN_MAP[header.trim()];
            if (dbFeld) {
              if (dbFeld === "pflegegrad" || dbFeld === "budget45b" || dbFeld === "budget45a" || dbFeld === "budget39") {
                const num = parseFloat(String(wert).replace(",", "."));
                if (!isNaN(num)) (k as any)[dbFeld] = num;
              } else {
                (k as any)[dbFeld] = String(wert).trim();
              }
            }
          }
          if (!k.vorname || !k.nachname) {
            validierungsFehler.push(`Zeile ${idx + 2}: Vorname oder Nachname fehlt`);
            return;
          }
          mapped.push(k as KundeImportRow);
        });

        setVorschau(mapped);
        setFehler(validierungsFehler);
      } catch (e: any) {
        setFehler([`Datei konnte nicht gelesen werden: ${e.message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function startImport() {
    if (vorschau.length === 0) { toast.error("Keine Daten zum Importieren"); return; }
    importMutation.mutate({ kunden: vorschau, dateiname });
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">📥</span>
        <div>
          <h1 className="text-xl font-bold text-green-800">Import-Assistent</h1>
          <p className="text-sm text-gray-500">Excel/CSV-Dateien importieren und Änderungen nachverfolgen</p>
        </div>
      </div>

      <Tabs defaultValue="import">
        <TabsList className="w-full">
          <TabsTrigger value="import" className="flex-1">📤 Import</TabsTrigger>
          <TabsTrigger value="protokoll" className="flex-1">📋 Protokolle</TabsTrigger>
          <TabsTrigger value="aenderungen" className="flex-1">🔍 Änderungsprotokoll</TabsTrigger>
        </TabsList>

        {/* ── Import-Tab ── */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Schritt 1: Datei auswählen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Unterstützte Formate: <strong>Excel (.xlsx, .xls)</strong> und <strong>CSV (.csv)</strong>.
                Die erste Zeile muss Spaltenüberschriften enthalten.
              </p>
              <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center cursor-pointer hover:bg-green-50 transition-colors"
                   onClick={() => fileRef.current?.click()}>
                <p className="text-3xl mb-2">📂</p>
                <p className="font-medium text-green-700">Datei auswählen oder hierher ziehen</p>
                <p className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls) oder CSV (.csv)</p>
                {dateiname && <p className="mt-2 text-sm font-medium text-green-600">✓ {dateiname}</p>}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleDatei} />

              {/* Spalten-Referenz */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Unterstützte Spaltenüberschriften anzeigen</summary>
                <div className="mt-2 grid grid-cols-2 gap-1 bg-gray-50 p-3 rounded">
                  {Object.entries(SPALTEN_MAP).map(([header, feld]) => (
                    <span key={header} className="text-gray-600"><code className="bg-white px-1 rounded">{header}</code> → {feld}</span>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>

          {fehler.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="font-medium text-red-700 mb-2">⚠️ Validierungsfehler ({fehler.length})</p>
                {fehler.map((f, i) => <p key={i} className="text-sm text-red-600">{f}</p>)}
              </CardContent>
            </Card>
          )}

          {vorschau.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Schritt 2: Vorschau ({vorschau.length} Datensätze)</span>
                  <Button onClick={startImport} disabled={importMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white">
                    {importMutation.isPending ? "Importiere..." : `${vorschau.length} Kunden importieren`}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-1 text-left">Vorname</th>
                        <th className="border p-1 text-left">Nachname</th>
                        <th className="border p-1 text-left">PLZ/Ort</th>
                        <th className="border p-1 text-left">PG</th>
                        <th className="border p-1 text-left">§</th>
                        <th className="border p-1 text-right">§45b</th>
                        <th className="border p-1 text-right">§45a</th>
                        <th className="border p-1 text-right">§39</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vorschau.slice(0, 20).map((k, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border p-1">{k.vorname}</td>
                          <td className="border p-1">{k.nachname}</td>
                          <td className="border p-1">{k.plz} {k.ort}</td>
                          <td className="border p-1">{k.pflegegrad ?? "–"}</td>
                          <td className="border p-1">{k.paragraph ?? "–"}</td>
                          <td className="border p-1 text-right">{k.budget45b ? `${k.budget45b} €` : "–"}</td>
                          <td className="border p-1 text-right">{k.budget45a ? `${k.budget45a} €` : "–"}</td>
                          <td className="border p-1 text-right">{k.budget39 ? `${k.budget39} €` : "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {vorschau.length > 20 && <p className="text-xs text-gray-400 mt-1">... und {vorschau.length - 20} weitere</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {ergebnis && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 space-y-2">
                <p className="font-bold text-green-800">✅ Import abgeschlossen</p>
                <div className="flex gap-3">
                  <Badge className="bg-green-600">+{ergebnis.anzahlNeu} neu</Badge>
                  <Badge className="bg-blue-600">↻ {ergebnis.anzahlAktualisiert} aktualisiert</Badge>
                  {ergebnis.anzahlFehler > 0 && <Badge className="bg-red-600">⚠ {ergebnis.anzahlFehler} Fehler</Badge>}
                </div>
                {ergebnis.fehlerDetails.length > 0 && (
                  <div className="text-xs text-red-600 mt-2">
                    {ergebnis.fehlerDetails.map((f, i) => <p key={i}>{f}</p>)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Protokoll-Tab ── */}
        <TabsContent value="protokoll">
          <Card>
            <CardHeader><CardTitle className="text-base">Import-Protokolle</CardTitle></CardHeader>
            <CardContent>
              {!protokolle || protokolle.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Noch keine Importe durchgeführt</p>
              ) : (
                <div className="space-y-2">
                  {(protokolle as any[]).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{p.dateiname ?? "Unbekannte Datei"}</p>
                        <p className="text-xs text-gray-500">
                          {p.vorname} {p.nachname} · {new Date(p.createdAt).toLocaleString("de-DE")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-green-600 text-xs">+{p.anzahlNeu}</Badge>
                        <Badge className="bg-blue-600 text-xs">↻{p.anzahlAktualisiert}</Badge>
                        {p.anzahlFehler > 0 && <Badge className="bg-red-600 text-xs">⚠{p.anzahlFehler}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Änderungsprotokoll-Tab ── */}
        <TabsContent value="aenderungen">
          <Card>
            <CardHeader><CardTitle className="text-base">Änderungsprotokoll (letzte 200 Einträge)</CardTitle></CardHeader>
            <CardContent>
              {!aenderungen || aenderungen.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Noch keine Änderungen protokolliert</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-1 text-left">Zeitpunkt</th>
                        <th className="border p-1 text-left">Tabelle</th>
                        <th className="border p-1 text-left">ID</th>
                        <th className="border p-1 text-left">Feld</th>
                        <th className="border p-1 text-left">Alt</th>
                        <th className="border p-1 text-left">Neu</th>
                        <th className="border p-1 text-left">Benutzer</th>
                        <th className="border p-1 text-left">Quelle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(aenderungen as any[]).map((a: any) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="border p-1 whitespace-nowrap">{new Date(a.createdAt).toLocaleString("de-DE")}</td>
                          <td className="border p-1"><Badge variant="outline" className="text-xs">{a.tabelle}</Badge></td>
                          <td className="border p-1">{a.datensatzId}</td>
                          <td className="border p-1 font-mono">{a.feld}</td>
                          <td className="border p-1 text-red-600 max-w-[100px] truncate">{a.alterWert ?? "–"}</td>
                          <td className="border p-1 text-green-600 max-w-[100px] truncate">{a.neuerWert ?? "–"}</td>
                          <td className="border p-1">{a.vorname ? `${a.vorname} ${a.nachname}` : "System"}</td>
                          <td className="border p-1 text-gray-400">{a.importquelle ?? "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
