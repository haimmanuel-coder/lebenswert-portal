import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import SignatureCanvas from "@/components/SignatureCanvas";
import jsPDF from "jspdf";

const ANFRAGE_TYPEN: Record<string, string> = {
  budget_45b: "Budget §45b (Entlastungsleistungen)",
  budget_45a: "Budget §45a (Alltagsbegleitung)",
  budget_39: "Budget §39 (Verhinderungspflege)",
  alle_budgets: "Alle verfuegbaren Budgets",
  pflegegrad: "Pflegegrad-Abfrage",
  sonstiges: "Sonstige Anfrage",
};

const STATUS_FARBE: Record<string, string> = {
  offen: "bg-yellow-100 text-yellow-800",
  gesendet: "bg-blue-100 text-blue-800",
  beantwortet: "bg-green-100 text-green-800",
  abgelehnt: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  gesendet: "Gesendet",
  beantwortet: "Beantwortet",
  abgelehnt: "Abgelehnt",
};

function generiereVollmachtText(
  kundenName: string,
  versicherungsnummer: string,
  kasseName: string,
  anfrageTyp: string,
  mitarbeiterName: string,
  datum: string
): string {
  return `VOLLMACHT ZUR BUDGET-ABFRAGE

Ich, ${kundenName}, Versicherungsnummer: ${versicherungsnummer},
erteile hiermit der Lebenswert Betreuung GmbH, vertreten durch
${mitarbeiterName}, die Vollmacht, bei meiner Krankenkasse
${kasseName} folgende Informationen abzufragen:

${ANFRAGE_TYPEN[anfrageTyp] || anfrageTyp}

Diese Vollmacht gilt fuer die einmalige Abfrage am ${datum} und
berechtigt zur Einholung aller relevanten Informationen bezueglich
der oben genannten Leistungen.

Ich bin damit einverstanden, dass die abgefragten Informationen
zum Zweck der Pflegeplanung und Abrechnung verwendet werden.

Ort, Datum: ___________________

Unterschrift Kunde/Kundin: ___________________

Unterschrift Betreuer/in: ___________________`;
}

function erstellePDF(anfrage: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  let y = 20;

  // Header
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LEBENSWERT BETREUUNG", margin, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Vollmacht zur Budget-Abfrage", margin, 20);
  y = 40;

  // Titel
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("VOLLMACHT ZUR BUDGET-ABFRAGE", margin, y);
  y += 12;

  // Trennlinie
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, y, 210 - margin, y);
  y += 8;

  // Kundendaten
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Kundendaten", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Name: ${anfrage.vorname || ""} ${anfrage.nachname || ""}`, margin, y); y += 6;
  doc.text(`Versicherungsnummer: ${anfrage.versicherungsnummer || "nicht angegeben"}`, margin, y); y += 6;
  doc.text(`Pflegegrad: ${anfrage.pflegegrad || "nicht angegeben"}`, margin, y); y += 6;
  doc.text(`Krankenkasse: ${anfrage.kasseName || "nicht angegeben"}`, margin, y); y += 6;
  if (anfrage.ikNummer) { doc.text(`IK-Nummer: ${anfrage.ikNummer}`, margin, y); y += 6; }
  y += 4;

  // Anfrage-Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Anfrage-Details", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Anfrage-Typ: ${ANFRAGE_TYPEN[anfrage.anfrageTyp] || anfrage.anfrageTyp}`, margin, y); y += 6;
  doc.text(`Datum: ${new Date(anfrage.createdAt).toLocaleDateString("de-DE")}`, margin, y); y += 6;
  doc.text(`Bearbeiter: ${anfrage.mitarbeiterVorname || ""} ${anfrage.mitarbeiterNachname || ""}`, margin, y); y += 6;
  y += 4;

  // Vollmacht-Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Vollmachtstext", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const vollmachtLines = doc.splitTextToSize(
    anfrage.vollmachtText || generiereVollmachtText(
      `${anfrage.vorname} ${anfrage.nachname}`,
      anfrage.versicherungsnummer || "",
      anfrage.kasseName || "",
      anfrage.anfrageTyp,
      `${anfrage.mitarbeiterVorname} ${anfrage.mitarbeiterNachname}`,
      new Date(anfrage.createdAt).toLocaleDateString("de-DE")
    ),
    170
  );
  doc.text(vollmachtLines, margin, y);
  y += vollmachtLines.length * 5 + 10;

  // Unterschriften
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, y, 210 - margin, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Unterschriften", margin, y);
  y += 10;

  const sigBoxW = 80;
  const sigBoxH = 30;

  // Kunden-Unterschrift
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Unterschrift Kunde/Kundin:", margin, y);
  y += 4;
  doc.setDrawColor(0, 100, 0);
  doc.rect(margin, y, sigBoxW, sigBoxH);
  if (anfrage.unterschriftKunde) {
    try { doc.addImage(anfrage.unterschriftKunde, "PNG", margin + 2, y + 2, sigBoxW - 4, sigBoxH - 4); } catch {}
  }
  doc.text(`${anfrage.vorname} ${anfrage.nachname}`, margin, y + sigBoxH + 5);
  doc.text(`Datum: ${new Date(anfrage.createdAt).toLocaleDateString("de-DE")}`, margin, y + sigBoxH + 10);

  // Mitarbeiter-Unterschrift
  const sig2X = margin + sigBoxW + 10;
  doc.text("Unterschrift Betreuer/in:", sig2X, y - 4);
  doc.setDrawColor(0, 0, 150);
  doc.rect(sig2X, y, sigBoxW, sigBoxH);
  if (anfrage.unterschriftMitarbeiter) {
    try { doc.addImage(anfrage.unterschriftMitarbeiter, "PNG", sig2X + 2, y + 2, sigBoxW - 4, sigBoxH - 4); } catch {}
  }
  doc.text(`${anfrage.mitarbeiterVorname} ${anfrage.mitarbeiterNachname}`, sig2X, y + sigBoxH + 5);
  y += sigBoxH + 20;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Lebenswert Betreuung GmbH | Dieses Dokument wurde elektronisch erstellt.", margin, 285);

  const dateiname = `Vollmacht_${anfrage.nachname}_${anfrage.vorname}_${new Date(anfrage.createdAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(dateiname);
}

// ── Hauptkomponente ───────────────────────────────────────────────
export default function Kassenanfrage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedKundeId, setSelectedKundeId] = useState<string>("");
  const [selectedKostentraegerId, setSelectedKostentraegerId] = useState<string>("");
  const [anfrageTyp, setAnfrageTyp] = useState<string>("");
  const [notizen, setNotizen] = useState("");
  const [unterschriftKunde, setUnterschriftKunde] = useState<string | undefined>();
  const [unterschriftMitarbeiter, setUnterschriftMitarbeiter] = useState<string | undefined>();
  const [vorschauKunde, setVorschauKunde] = useState<string | undefined>();
  const [vorschauMitarbeiter, setVorschauMitarbeiter] = useState<string | undefined>();
  const sigKundeRef = useRef<any>(null);
  const sigMitarbeiterRef = useRef<any>(null);

  const { data: anfragen, isLoading, error, refetch } = trpc.kassenanfrage.list.useQuery();
  const { data: kunden } = trpc.kunden.list.useQuery();
  const { data: kostentraeger } = trpc.kostentraeger.list.useQuery();

  const createMutation = trpc.kassenanfrage.create.useMutation({
    onSuccess: () => {
      toast.success("Vollmacht gespeichert und PDF kann heruntergeladen werden!");
      refetch();
      resetForm();
      setShowForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.kassenanfrage.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setSelectedKundeId("");
    setSelectedKostentraegerId("");
    setAnfrageTyp("");
    setNotizen("");
    setUnterschriftKunde(undefined);
    setUnterschriftMitarbeiter(undefined);
    setVorschauKunde(undefined);
    setVorschauMitarbeiter(undefined);
    sigKundeRef.current?.clear();
    sigMitarbeiterRef.current?.clear();
  }

  function handleSubmit() {
    if (!selectedKundeId) { toast.error("Bitte einen Kunden auswaehlen"); return; }
    if (!anfrageTyp) { toast.error("Bitte einen Anfrage-Typ auswaehlen"); return; }
    if (!unterschriftKunde) { toast.error("Bitte Kunden-Unterschrift einholen"); return; }
    if (!unterschriftMitarbeiter) { toast.error("Bitte eigene Unterschrift leisten"); return; }

    const kunde = kunden?.find(k => k.id === parseInt(selectedKundeId));
    const kt = kostentraeger?.find(k => k.id === parseInt(selectedKostentraegerId));

    const vollmachtText = generiereVollmachtText(
      `${kunde?.vorname} ${kunde?.nachname}`,
      kunde?.versicherungsnummer || "",
      kt?.name || "unbekannte Kasse",
      anfrageTyp,
      "Mitarbeiter/in",
      new Date().toLocaleDateString("de-DE")
    );

    createMutation.mutate({
      kundenId: parseInt(selectedKundeId),
      kostentraegerId: selectedKostentraegerId ? parseInt(selectedKostentraegerId) : undefined,
      anfrageTyp: anfrageTyp as any,
      vollmachtText,
      unterschriftKunde,
      unterschriftMitarbeiter,
      notizen: notizen || undefined,
    });
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );

  if (error) return (
    <div className="p-4 text-center text-red-600">
      <p>Fehler beim Laden: {error.message}</p>
      <Button onClick={() => refetch()} className="mt-2">Erneut versuchen</Button>
    </div>
  );

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kassenanfragen</h1>
          <p className="text-sm text-gray-500">Vollmachten zur Budget-Abfrage bei Krankenkassen</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-700 hover:bg-green-800 text-white">
          + Neue Anfrage
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Gesamt", value: anfragen?.length || 0, color: "bg-gray-100" },
          { label: "Offen", value: anfragen?.filter(a => a.status === "offen").length || 0, color: "bg-yellow-50" },
          { label: "Gesendet", value: anfragen?.filter(a => a.status === "gesendet").length || 0, color: "bg-blue-50" },
          { label: "Beantwortet", value: anfragen?.filter(a => a.status === "beantwortet").length || 0, color: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-lg p-2 text-center`}>
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anfragen-Liste */}
      {!anfragen || anfragen.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">Noch keine Kassenanfragen</p>
          <p className="text-sm mt-1">Erstelle die erste Vollmacht zur Budget-Abfrage</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anfragen.map((a: any) => (
            <Card key={a.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{a.vorname} {a.nachname}</p>
                    <p className="text-sm text-gray-500">{ANFRAGE_TYPEN[a.anfrageTyp] || a.anfrageTyp}</p>
                    <p className="text-xs text-gray-400">{a.kasseName || "Kasse nicht angegeben"}</p>
                  </div>
                  <Badge className={STATUS_FARBE[a.status] || "bg-gray-100"}>
                    {STATUS_LABEL[a.status] || a.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString("de-DE")} · {a.mitarbeiterVorname} {a.mitarbeiterNachname}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => erstellePDF(a)}
                    >
                      PDF
                    </Button>
                    {a.status === "offen" && (
                      <Button
                        size="sm"
                        className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => updateStatusMutation.mutate({ id: a.id, status: "gesendet" })}
                      >
                        Als gesendet markieren
                      </Button>
                    )}
                    {a.status === "gesendet" && (
                      <Button
                        size="sm"
                        className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateStatusMutation.mutate({ id: a.id, status: "beantwortet" })}
                      >
                        Beantwortet
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Neue Anfrage Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[95vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Neue Kassenanfrage / Vollmacht</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-8">
            {/* Hinweis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Hinweis:</strong> Diese Vollmacht berechtigt Lebenswert Betreuung, im Namen des Kunden
              Budget-Informationen bei der Krankenkasse abzufragen. Bitte Kunden-Unterschrift einholen.
            </div>

            {/* Kunde */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Kunde *</label>
              <Select value={selectedKundeId} onValueChange={setSelectedKundeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunden auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {kunden?.map(k => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.nachname}, {k.vorname} {k.pflegegrad ? `(PG ${k.pflegegrad})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Krankenkasse */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Krankenkasse</label>
              <Select value={selectedKostentraegerId} onValueChange={setSelectedKostentraegerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Krankenkasse auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {kostentraeger?.filter((k: any) => k.aktiv).map((k: any) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.name} {k.ikNummer ? `(IK: ${k.ikNummer})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Anfrage-Typ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Anfrage-Typ *</label>
              <Select value={anfrageTyp} onValueChange={setAnfrageTyp}>
                <SelectTrigger>
                  <SelectValue placeholder="Art der Anfrage auswaehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ANFRAGE_TYPEN).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notizen (optional)</label>
              <Textarea
                value={notizen}
                onChange={e => setNotizen(e.target.value)}
                placeholder="Besondere Hinweise zur Anfrage..."
                rows={2}
              />
            </div>

            {/* Kunden-Unterschrift */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unterschrift Kunde/Kundin *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Bitte den Kunden/die Kundin hier unterschreiben lassen, um die Vollmacht zu bestaetigen.
              </p>
              <div className="border-2 border-green-400 rounded-lg overflow-hidden">
                <SignatureCanvas
                  ref={sigKundeRef}
                  onDrawEnd={(data) => { setUnterschriftKunde(data ?? undefined); setVorschauKunde(data ?? undefined); }}
                  onClear={() => { setUnterschriftKunde(undefined); setVorschauKunde(undefined); }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                {vorschauKunde && (
                  <div className="flex items-center gap-2">
                    <img src={vorschauKunde} alt="Vorschau" className="h-8 w-20 object-contain border border-green-300 rounded" />
                    <span className="text-xs text-green-600 font-medium">Unterschrift erkannt</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 ml-auto"
                  onClick={() => { sigKundeRef.current?.clear(); setUnterschriftKunde(undefined); setVorschauKunde(undefined); }}
                >
                  Zuruecksetzen
                </Button>
              </div>
            </div>

            {/* Mitarbeiter-Unterschrift */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unterschrift Betreuer/in *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Bitte hier als Betreuer/in unterschreiben.
              </p>
              <div className="border-2 border-blue-400 rounded-lg overflow-hidden">
                <SignatureCanvas
                  ref={sigMitarbeiterRef}
                  onDrawEnd={(data) => { setUnterschriftMitarbeiter(data ?? undefined); setVorschauMitarbeiter(data ?? undefined); }}
                  onClear={() => { setUnterschriftMitarbeiter(undefined); setVorschauMitarbeiter(undefined); }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                {vorschauMitarbeiter && (
                  <div className="flex items-center gap-2">
                    <img src={vorschauMitarbeiter} alt="Vorschau" className="h-8 w-20 object-contain border border-blue-300 rounded" />
                    <span className="text-xs text-blue-600 font-medium">Unterschrift erkannt</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 ml-auto"
                  onClick={() => { sigMitarbeiterRef.current?.clear(); setUnterschriftMitarbeiter(undefined); setVorschauMitarbeiter(undefined); }}
                >
                  Zuruecksetzen
                </Button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { resetForm(); setShowForm(false); }}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Wird gespeichert..." : "Vollmacht speichern & PDF erstellen"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
