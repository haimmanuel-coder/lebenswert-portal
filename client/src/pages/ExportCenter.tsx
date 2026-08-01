import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";
import {
  Download, Mail, Calculator, FileText, Archive,
  Send, Check, Loader2, X, ChevronDown, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PFLEGEGRAD_BUDGETS: Record<number, { b45b: number; b45a: number; b39: number }> = {
  1: { b45b: 125,   b45a: 0,    b39: 0    },
  2: { b45b: 689,   b45a: 0,    b39: 1612 },
  3: { b45b: 689,   b45a: 0,    b39: 1995 },
  4: { b45b: 689,   b45a: 0,    b39: 1612 },
  5: { b45b: 689,   b45a: 0,    b39: 1995 },
};

function downloadCsv(content: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportCenter() {
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin";

  // Export-State
  const currentMonat = new Date().toISOString().slice(0, 7);
  const [exportMonat, setExportMonat] = useState(currentMonat);
  const [exportTyp, setExportTyp] = useState<"alle" | "leistungen" | "fahrten">("alle");

  // E-Brief State
  const [showEBrief, setShowEBrief] = useState(false);
  const [eBriefForm, setEBriefForm] = useState({ empfaenger: "", betreff: "", inhalt: "" });

  // Pflegegrad-Rechner State
  const [pflegegrad, setPflegegrad] = useState(2);
  const [verbraucht45b, setVerbraucht45b] = useState(0);
  const [verbraucht39, setVerbraucht39] = useState(0);

  const massExportMut = trpc.admin.massExport.useMutation({
    onSuccess: (data) => {
      if (data.leistungenCsv) {
        downloadCsv(data.leistungenCsv, `Leistungsnachweise_${exportMonat}.csv`);
      }
      if (data.fahrenCsv) {
        downloadCsv(data.fahrenCsv, `Fahrtenbuch_${exportMonat}.csv`);
      }
      toast.success(`Export erfolgreich: ${data.stats.leistungen} Nachweise, ${data.stats.fahrten} Fahrten`);
    },
    onError: (e) => toast.error(e.message),
  });

  const eBriefMut = trpc.admin.eBriefSend.useMutation({
    onSuccess: () => {
      toast.success("E-Brief gesendet und protokolliert");
      setShowEBrief(false);
      setEBriefForm({ empfaenger: "", betreff: "", inhalt: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: eBriefLogs = [] } = trpc.admin.eBriefLogs.useQuery({ limit: 10 }, { enabled: isAdmin });

  const budget = PFLEGEGRAD_BUDGETS[pflegegrad] ?? PFLEGEGRAD_BUDGETS[2];
  const rest45b = Math.max(0, budget.b45b - verbraucht45b);
  const rest39 = Math.max(0, budget.b39 - verbraucht39);
  const prozent45b = budget.b45b > 0 ? Math.min(100, (verbraucht45b / budget.b45b) * 100) : 0;
  const prozent39 = budget.b39 > 0 ? Math.min(100, (verbraucht39 / budget.b39) * 100) : 0;

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nur für Administratoren zugänglich.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Archive className="w-5 h-5 text-[#4a8c3f]" />
        <h1 className="font-bold text-gray-800">Export-Center</h1>
      </div>

      {/* ── MASSEN-EXPORT ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-[#4a8c3f]" />
            Massen-Download (CSV)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">Exportiere alle Leistungsnachweise und/oder Fahrtenbuch-Einträge eines Monats als CSV-Datei.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Monat</label>
              <Input
                type="month"
                value={exportMonat}
                onChange={(e) => setExportMonat(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Typ</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={exportTyp}
                onChange={(e) => setExportTyp(e.target.value as any)}
              >
                <option value="alle">Alle</option>
                <option value="leistungen">Nur Leistungsnachweise</option>
                <option value="fahrten">Nur Fahrtenbuch</option>
              </select>
            </div>
          </div>
          <Button
            className="w-full bg-[#4a8c3f] hover:bg-[#3a7230] text-white gap-2"
            disabled={massExportMut.isPending}
            onClick={() => massExportMut.mutate({ monat: exportMonat, typ: exportTyp })}
          >
            {massExportMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV herunterladen
          </Button>
        </CardContent>
      </Card>

      {/* ── PFLEGEGRAD-RECHNER ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#4a8c3f]" />
            Pflegegrad-Budget-Rechner
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">Berechne das verfügbare Jahresbudget nach SGB XI (Stand 2024) und den Restbetrag.</p>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Pflegegrad</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPflegegrad(pg)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    pflegegrad === pg ? "bg-[#4a8c3f] text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {pg}
                </button>
              ))}
            </div>
          </div>

          {/* §45b Budget */}
          <div className="bg-green-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-green-800">§45b SGB XI – Entlastungsbetrag</span>
              <span className="text-xs font-bold text-green-700">{budget.b45b} €/Jahr</span>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bereits verbraucht (€)</label>
              <Input
                type="number"
                min={0}
                max={budget.b45b}
                value={verbraucht45b}
                onChange={(e) => setVerbraucht45b(Math.min(budget.b45b, Number(e.target.value)))}
                className="text-sm h-8"
              />
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Verbraucht: {verbraucht45b} €</span>
                <span className={`font-bold ${rest45b < budget.b45b * 0.1 ? "text-red-600" : "text-green-700"}`}>
                  Restbudget: {rest45b.toFixed(2)} €
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${prozent45b > 90 ? "bg-red-500" : prozent45b > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${prozent45b}%` }}
                />
              </div>
              {rest45b < budget.b45b * 0.1 && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Weniger als 10% Restbudget!
                </p>
              )}
            </div>
          </div>

          {/* §39 Budget */}
          {budget.b39 > 0 && (
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-blue-800">§39 SGB XI – Verhinderungspflege</span>
                <span className="text-xs font-bold text-blue-700">{budget.b39} €/Jahr</span>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bereits verbraucht (€)</label>
                <Input
                  type="number"
                  min={0}
                  max={budget.b39}
                  value={verbraucht39}
                  onChange={(e) => setVerbraucht39(Math.min(budget.b39, Number(e.target.value)))}
                  className="text-sm h-8"
                />
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Verbraucht: {verbraucht39} €</span>
                  <span className={`font-bold ${rest39 < budget.b39 * 0.1 ? "text-red-600" : "text-blue-700"}`}>
                    Restbudget: {rest39.toFixed(2)} €
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${prozent39 > 90 ? "bg-red-500" : prozent39 > 70 ? "bg-yellow-500" : "bg-blue-500"}`}
                    style={{ width: `${prozent39}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {budget.b45a === 0 && budget.b39 === 0 && pflegegrad === 1 && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <Info className="w-3 h-3 inline mr-1" />
              Pflegegrad 1: Nur §45b Entlastungsbetrag (125 €/Jahr). Kein §39 oder §45a Anspruch.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── E-BRIEF MODUL ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#4a8c3f]" />
            E-Brief / Dokumentenversand
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">Dokumentiere den Versand von Briefen und Nachweisen an Kostenträger. Alle Sendungen werden protokolliert.</p>
          <Button
            className="w-full gap-2 border border-[#4a8c3f] text-[#4a8c3f] bg-white hover:bg-green-50"
            variant="outline"
            onClick={() => setShowEBrief(true)}
          >
            <Send className="w-4 h-4" />
            Neuen E-Brief erstellen
          </Button>

          {/* Letzte Sendungen */}
          {(eBriefLogs as any[]).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Letzte Sendungen</p>
              <div className="space-y-1.5">
                {(eBriefLogs as any[]).slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{log.betreff}</p>
                      <p className="text-xs text-gray-500 truncate">An: {log.empfaenger}</p>
                    </div>
                    <Badge className="text-xs bg-green-100 text-green-700 border-0 flex-shrink-0 ml-2">
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* A9/A11: OptaData-Vorbereitung – Abschlussprüfung */}
      <Card className="mb-4 border-2 border-blue-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="text-lg">🔗</span> OptaData-Vorbereitung
          </CardTitle>
          <p className="text-xs text-gray-500">Abschlussprüfung vor dem Übertrag an OptaData</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <div className="font-bold mb-1">📋 Checkliste vor dem OptaData-Export:</div>
            <div>✅ Alle Einsatznachweise des Monats abgeschlossen?</div>
            <div>✅ Unterschriften (Mitarbeiter + Kunde) vorhanden?</div>
            <div>✅ Leistungstyp (§45b / §45a / §39) korrekt zugeordnet?</div>
            <div>✅ Kostenträger bei jedem Kunden hinterlegt?</div>
            <div>✅ Beihilfe-Anteil korrekt erfasst (falls zutreffend)?</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
            <Info className="w-3 h-3 inline mr-1" />
            <strong>Hinweis:</strong> Der CSV-Export (oben) enthält alle Pflichtfelder für den OptaData-Import. Bitte prüfen Sie die Datei vor dem Hochladen in OptaData auf Vollständigkeit.
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => {
              toast.info("🔗 OptaData-Direktanbindung in Vorbereitung. CSV-Export ist bereits OptaData-kompatibel.");
            }}
          >
            <Download className="w-4 h-4" />
            OptaData-kompatiblen CSV exportieren
          </Button>
        </CardContent>
      </Card>

      {/* E-Brief Sheet */}
      {showEBrief && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEBrief(false)} />
          <div className="relative w-full bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">E-Brief erstellen</h2>
              <button onClick={() => setShowEBrief(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Empfänger *</label>
                <Input
                  placeholder="z.B. AOK Bayern, Pflegekasse"
                  value={eBriefForm.empfaenger}
                  onChange={(e) => setEBriefForm({ ...eBriefForm, empfaenger: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Betreff *</label>
                <Input
                  placeholder="z.B. Leistungsnachweis Mai 2025"
                  value={eBriefForm.betreff}
                  onChange={(e) => setEBriefForm({ ...eBriefForm, betreff: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Inhalt / Notiz</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px] resize-none"
                  placeholder="Optionale Notiz zum Versand..."
                  value={eBriefForm.inhalt}
                  onChange={(e) => setEBriefForm({ ...eBriefForm, inhalt: e.target.value })}
                />
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
                <Info className="w-3 h-3 inline mr-1" />
                Der Versand wird protokolliert. Für automatischen E-Mail-Versand kann ein E-Mail-Dienst (SendGrid) angebunden werden.
              </div>
              <Button
                className="w-full bg-[#4a8c3f] hover:bg-[#3a7230] text-white gap-2"
                disabled={eBriefMut.isPending}
                onClick={() => {
                  if (!eBriefForm.empfaenger.trim() || !eBriefForm.betreff.trim()) {
                    toast.error("Empfänger und Betreff sind erforderlich");
                    return;
                  }
                  eBriefMut.mutate({ empfaenger: eBriefForm.empfaenger, betreff: eBriefForm.betreff, inhalt: eBriefForm.inhalt });
                }}
              >
                {eBriefMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Senden & Protokollieren
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
