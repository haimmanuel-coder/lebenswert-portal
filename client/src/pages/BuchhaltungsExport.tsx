import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function downloadCsv(content: string, filename: string) {
  const bom = "\uFEFF"; // UTF-8 BOM für Excel
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDefaultMonat() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export default function BuchhaltungsExport() {
  const [monat, setMonat] = useState(getDefaultMonat());

  const datevMut = trpc.admin.datevExport.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.csv, data.dateiname);
      toast.success(`DATEV-Export: ${data.zeilen} Zeilen heruntergeladen`);
    },
    onError: (e) => toast.error(e.message),
  });

  const lexwareMut = trpc.admin.lexwareExport.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.leistungenCsv, `Lexware_Leistungen_${monat}.csv`);
      setTimeout(() => downloadCsv(data.fahrtenCsv, `Lexware_Fahrten_${monat}.csv`), 500);
      toast.success(`Lexware-Export: ${data.zeilen} Zeilen heruntergeladen`);
    },
    onError: (e) => toast.error(e.message),
  });

  const massMut = trpc.admin.massExport.useMutation({
    onSuccess: (data) => {
      if (data.leistungenCsv) downloadCsv(data.leistungenCsv, `Leistungen_${monat}.csv`);
      if (data.fahrenCsv) setTimeout(() => downloadCsv(data.fahrenCsv!, `Fahrten_${monat}.csv`), 500);
      toast.success("Standard-Export heruntergeladen");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">📊 Buchhaltungs-Export</h1>
      </div>

      {/* Monatsauswahl */}
      <Card className="mb-4 border-gray-200">
        <CardContent className="p-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">📅 Monat auswählen</label>
          <input
            type="month"
            value={monat}
            onChange={e => setMonat(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Exportiert alle Leistungsnachweise und Fahrten für {new Date(monat + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </p>
        </CardContent>
      </Card>

      {/* DATEV-Export */}
      <Card className="mb-4 border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-blue-800">🏦 DATEV LODAS-Export</CardTitle>
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">Lohnbuchhaltung</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-600">
            Exportiert Leistungsdaten im DATEV LODAS-Format (CSV) zur direkten Übernahme in DATEV Lohn und Gehalt.
            Enthält: Personalnummer, Lohnart, Betrag, Kostenstelle.
          </p>
          <div className="text-xs text-gray-500 bg-white rounded p-2 border border-blue-100 font-mono">
            Personalnummer;Nachname;Vorname;Lohnart;Betrag;Monat;Kostenstelle;Bemerkung
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => datevMut.mutate({ monat })}
            disabled={datevMut.isPending}
          >
            {datevMut.isPending ? "⏳ Wird erstellt..." : "⬇️ DATEV LODAS herunterladen"}
          </Button>
        </CardContent>
      </Card>

      {/* Lexware-Export */}
      <Card className="mb-4 border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-purple-800">📋 Lexware-Export</CardTitle>
            <Badge className="bg-purple-100 text-purple-800 border border-purple-200 text-xs">Lohnabrechnung</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-600">
            Exportiert Leistungen und Fahrten im Lexware-Format (2 CSV-Dateien) zur Übernahme in Lexware Lohn+Gehalt.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="bg-white rounded p-2 border border-purple-100">
              <p className="font-semibold text-purple-700">Leistungen.csv</p>
              <p>Mitarbeiter, Paragraph, Stunden, Betrag</p>
            </div>
            <div className="bg-white rounded p-2 border border-purple-100">
              <p className="font-semibold text-purple-700">Fahrten.csv</p>
              <p>Mitarbeiter, Kilometer, Betrag (0,30€/km)</p>
            </div>
          </div>
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => lexwareMut.mutate({ monat })}
            disabled={lexwareMut.isPending}
          >
            {lexwareMut.isPending ? "⏳ Wird erstellt..." : "⬇️ Lexware-Dateien herunterladen"}
          </Button>
        </CardContent>
      </Card>

      {/* Standard-Export */}
      <Card className="mb-4 border-teal-200 bg-teal-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-teal-800">📁 Standard-Export (CSV)</CardTitle>
            <Badge className="bg-teal-100 text-teal-800 border border-teal-200 text-xs">Allgemein</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-600">
            Vollständiger Export aller Leistungsnachweise und Fahrten als Standard-CSV für Excel oder andere Programme.
          </p>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm"
              onClick={() => massMut.mutate({ monat, typ: "leistungen" })}
              disabled={massMut.isPending}
            >
              Leistungen
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm"
              onClick={() => massMut.mutate({ monat, typ: "fahrten" })}
              disabled={massMut.isPending}
            >
              Fahrten
            </Button>
            <Button
              className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-sm"
              onClick={() => massMut.mutate({ monat, typ: "alle" })}
              disabled={massMut.isPending}
            >
              Alle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hinweis */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-3">
          <p className="text-xs text-gray-500">
            <strong>💡 Hinweis:</strong> Alle Exporte werden als CSV-Datei heruntergeladen und können direkt in DATEV, Lexware oder Excel importiert werden.
            Die Dateien enthalten einen UTF-8 BOM für korrekte Darstellung von Umlauten in Excel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
