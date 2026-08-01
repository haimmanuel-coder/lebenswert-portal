/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FAHRTENNACHWEISE-ABRECHNUNG
 *  Zeitraum: 16. – 15. | Admin-Freigabe | E-Mail an Steuerbüro am 18.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// ─── Status-Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    offen:       { label: "Offen",       className: "bg-gray-100 text-gray-700 border-gray-300" },
    freigegeben: { label: "Freigegeben", className: "bg-blue-100 text-blue-700 border-blue-300" },
    versendet:   { label: "Versendet ✓", className: "bg-green-100 text-green-700 border-green-300" },
    fehler:      { label: "Fehler",      className: "bg-red-100 text-red-700 border-red-300" },
  };
  const s = map[status] ?? map.offen;
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export default function FahrtenAbrechnung() {
  const utils = trpc.useUtils();

  // Daten
  const { data: zeitraum } = trpc.fahrtenAbrechnung.aktuellerZeitraum.useQuery();
  const { data: abrechnungen, isLoading } = trpc.fahrtenAbrechnung.list.useQuery();
  const { data: einstellungen } = trpc.fahrtenAbrechnung.getEinstellungen.useQuery();

  // Einstellungs-State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [autoVersand, setAutoVersand] = useState(true);
  const [einstellungenGeladen, setEinstellungenGeladen] = useState(false);

  if (einstellungen && !einstellungenGeladen) {
    setEmail(einstellungen.steuerbuero_email ?? "");
    setName(einstellungen.steuerbuero_name ?? "Steuerbüro");
    setAutoVersand(einstellungen.fahrtnachweis_auto_versand !== "false");
    setEinstellungenGeladen(true);
  }

  // Mutations
  const zusammenfuehren = trpc.fahrtenAbrechnung.zusammenfuehren.useMutation({
    onSuccess: (data: any) => {
      toast.success(`${data.anzahl} Fahrten zusammengeführt – ${data.gesamtKm.toFixed(1)} km / ${data.gesamtEuro.toFixed(2)} €`);
      utils.fahrtenAbrechnung.list.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const freigeben = trpc.fahrtenAbrechnung.freigeben.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Freigegeben – PDF mit ${data.anzahlFahrten} Fahrten erstellt`);
      utils.fahrtenAbrechnung.list.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const senden = trpc.fahrtenAbrechnung.senden.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Erfolgreich an ${data.empfaengerEmail} gesendet`);
      utils.fahrtenAbrechnung.list.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const saveEinstellungen = trpc.fahrtenAbrechnung.saveEinstellungen.useMutation({
    onSuccess: () => toast.success("Einstellungen gespeichert"),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const liste: any[] = Array.isArray(abrechnungen) ? abrechnungen : [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Fahrtennachweise-Abrechnung</h1>
          <p className="text-sm text-gray-500 mt-1">
            Abrechnungszeitraum: 16. des Vormonats bis 15. des aktuellen Monats
          </p>
        </div>
        {zeitraum && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Aktueller Zeitraum</p>
              <p className="font-semibold text-green-800 text-sm">{zeitraum.label}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="abrechnungen">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="abrechnungen">Abrechnungen</TabsTrigger>
          <TabsTrigger value="einstellungen">Einstellungen</TabsTrigger>
        </TabsList>

        {/* ── Tab: Abrechnungen ─────────────────────────────────────────── */}
        <TabsContent value="abrechnungen" className="space-y-4 mt-4">

          {/* Neue Abrechnung erstellen */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-blue-900">Aktuelle Periode zusammenführen</p>
                <p className="text-sm text-blue-700">
                  Alle Fahrten vom {zeitraum?.von} bis {zeitraum?.bis} werden aggregiert.
                </p>
              </div>
              <Button
                onClick={() => zusammenfuehren.mutate({})}
                disabled={zusammenfuehren.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {zusammenfuehren.isPending ? "Lädt…" : "🔄 Zusammenführen"}
              </Button>
            </CardContent>
          </Card>

          {/* Abrechnungsliste */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Lade Abrechnungen…</div>
          ) : liste.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">🚗</p>
                <p>Noch keine Abrechnungen vorhanden.</p>
                <p className="text-sm">Klicken Sie auf "Zusammenführen" um die erste Abrechnung zu erstellen.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {liste.map((abr: any) => (
                <Card key={abr.id} className="border border-gray-200 hover:border-green-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={abr.status} />
                          <span className="font-semibold text-gray-800 truncate">{abr.label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-gray-500">Fahrten</span>
                            <p className="font-medium">{abr.anzahlFahrten}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Kilometer</span>
                            <p className="font-medium">{Number(abr.gesamtKm).toFixed(1)} km</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Betrag</span>
                            <p className="font-medium text-green-700">{Number(abr.gesamtEuro).toFixed(2)} €</p>
                          </div>
                        </div>
                        {abr.freigegebenAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Freigegeben am {new Date(abr.freigegebenAt).toLocaleDateString("de-DE")}
                            {abr.freigegebenVonName && ` von ${abr.freigegebenVonName}`}
                          </p>
                        )}
                        {abr.versendetAt && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Versendet am {new Date(abr.versendetAt).toLocaleDateString("de-DE")}
                            {abr.empfaengerEmail && ` an ${abr.empfaengerEmail}`}
                          </p>
                        )}
                      </div>

                      {/* Aktions-Buttons */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {abr.status === "offen" && (
                          <Button
                            size="sm"
                            onClick={() => freigeben.mutate({ abrechnungId: abr.id })}
                            disabled={freigeben.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            ✅ Freigeben
                          </Button>
                        )}
                        {abr.status === "freigegeben" && (
                          <>
                            {abr.pdfUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(abr.pdfUrl, "_blank")}
                              >
                                📄 PDF
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => senden.mutate({ abrechnungId: abr.id })}
                              disabled={senden.isPending}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              📧 Senden
                            </Button>
                          </>
                        )}
                        {abr.status === "versendet" && abr.pdfUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(abr.pdfUrl, "_blank")}
                          >
                            📄 PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Einstellungen ────────────────────────────────────────── */}
        <TabsContent value="einstellungen" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steuerbüro-Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="sb-name">Name des Steuerbüros</Label>
                <Input
                  id="sb-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Steuerbüro Müller GmbH"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sb-email">E-Mail-Adresse des Steuerbüros</Label>
                <Input
                  id="sb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="steuerbuero@beispiel.de"
                />
                <p className="text-xs text-gray-500">
                  An diese Adresse werden die Fahrtennachweise am 18. jeden Monats automatisch versendet.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Automatischer Versand am 18.</Label>
                  <p className="text-sm text-gray-500">
                    Freigegebene Abrechnungen werden automatisch am 18. des Monats versendet.
                  </p>
                </div>
                <Switch
                  checked={autoVersand}
                  onCheckedChange={setAutoVersand}
                />
              </div>

              {autoVersand && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <strong>Automatik aktiv:</strong> Freigegebene Abrechnungen werden jeden 18. des Monats
                  automatisch an <strong>{email || "die hinterlegte E-Mail"}</strong> gesendet.
                </div>
              )}

              <Button
                onClick={() => saveEinstellungen.mutate({ steuerbuero_email: email, steuerbuero_name: name, fahrtnachweis_auto_versand: autoVersand })}
                disabled={saveEinstellungen.isPending || !email}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saveEinstellungen.isPending ? "Speichert…" : "💾 Einstellungen speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
