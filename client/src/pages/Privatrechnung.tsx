/**
 * Privatrechnung.tsx
 * Aufgaben A14+A15+A16: Sonderfahrten, Rechnungspositionen, Privatrechnung
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const KATEGORIEN = [
  { value: "einkauf", label: "🛒 Einkauf" },
  { value: "begleitservice", label: "🚶 Begleitservice" },
  { value: "eintrittsgeld", label: "🎭 Eintrittsgeld" },
  { value: "parkgebuehr", label: "🅿️ Parkgebühr" },
  { value: "porto", label: "📮 Porto" },
  { value: "medikamente", label: "💊 Medikamente" },
  { value: "sonstige", label: "📦 Sonstige" },
];

const STATUS_FARBEN: Record<string, string> = {
  entwurf: "bg-gray-400",
  versendet: "bg-blue-500",
  bezahlt: "bg-green-600",
  storniert: "bg-red-500",
};

export default function Privatrechnung() {
  const heute = new Date();
  const [monat, setMonat] = useState(`${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`);
  const [selectedKundenId, setSelectedKundenId] = useState<number | null>(null);

  // Sonderfahrt-Form
  const [sfForm, setSfForm] = useState({ datum: "", startAdresse: "", zielAdresse: "", kilometer: "", beschreibung: "" });
  // Rechnungsposition-Form
  const [posForm, setPosForm] = useState({ kategorie: "sonstige", beschreibung: "", menge: "1", einzelpreis: "", bemerkung: "" });

  const { data: kunden } = trpc.kunden.list.useQuery();
  const { data: sonderfahrten, refetch: refetchSF } = trpc.sonderfahrt.list.useQuery(
    { kundenId: selectedKundenId ?? undefined, monat },
    { enabled: !!selectedKundenId }
  );
  const { data: positionen, refetch: refetchPos } = trpc.rechnungsposition.list.useQuery(
    { kundenId: selectedKundenId!, monat },
    { enabled: !!selectedKundenId }
  );
  const { data: rechnungen, refetch: refetchRechnungen } = trpc.privatrechnung.list.useQuery({});

  const sfMutation = trpc.sonderfahrt.create.useMutation({
    onSuccess: () => { refetchSF(); setSfForm({ datum: "", startAdresse: "", zielAdresse: "", kilometer: "", beschreibung: "" }); toast.success("Sonderfahrt gespeichert"); },
    onError: (e) => toast.error(e.message),
  });
  const posMutation = trpc.rechnungsposition.create.useMutation({
    onSuccess: () => { refetchPos(); setPosForm({ kategorie: "sonstige", beschreibung: "", menge: "1", einzelpreis: "", bemerkung: "" }); toast.success("Position gespeichert"); },
    onError: (e) => toast.error(e.message),
  });
  const posDeleteMutation = trpc.rechnungsposition.delete.useMutation({
    onSuccess: () => { refetchPos(); toast.success("Position gelöscht"); },
  });
  const rechnungErstellenMutation = trpc.privatrechnung.erstellen.useMutation({
    onSuccess: (data) => { refetchRechnungen(); toast.success(`Rechnung ${data.rechnungsnummer} erstellt – Gesamt: ${data.gesamtbetrag} €`); },
    onError: (e) => toast.error(e.message),
  });
  const statusMutation = trpc.privatrechnung.updateStatus.useMutation({
    onSuccess: () => { refetchRechnungen(); toast.success("Status aktualisiert"); },
  });

  const sfSumme = (sonderfahrten as any[] ?? []).reduce((s: number, r: any) => s + parseFloat(String(r.kilometer ?? 0)) * 0.35, 0);
  const posSumme = (positionen as any[] ?? []).reduce((s: number, r: any) => s + parseFloat(String(r.menge ?? 1)) * parseFloat(String(r.einzelpreis ?? 0)), 0);
  const gesamtVorschau = Math.round((sfSumme + posSumme) * 100) / 100;
  const begleitungen = (sonderfahrten as any[] ?? []).filter((sf: any) => /arzt|einkauf/i.test(String(sf.beschreibung ?? "")));
  const arztBegleitungen = begleitungen.filter((sf: any) => /arzt/i.test(String(sf.beschreibung ?? "")));
  const einkaufsBegleitungen = begleitungen.filter((sf: any) => /einkauf/i.test(String(sf.beschreibung ?? "")));
  const begleitKm = begleitungen.reduce((sum: number, sf: any) => sum + parseFloat(String(sf.kilometer ?? 0)), 0);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">🧾</span>
        <div>
          <h1 className="text-xl font-bold text-green-800">Kundenbegleitungen & Monatsabrechnung</h1>
          <p className="text-sm text-gray-500">Arzt- und Einkaufsbegleitungen je Kunde sowie Sonderfahrten und Monatsrechnungen</p>
        </div>
      </div>

      <Tabs defaultValue="begleitungen">
        <TabsList className="w-full">
          <TabsTrigger value="begleitungen" className="flex-1">Kundenbegleitungen</TabsTrigger>
          <TabsTrigger value="erfassen" className="flex-1">✏️ Erfassen</TabsTrigger>
          <TabsTrigger value="rechnungen" className="flex-1">📄 Rechnungen</TabsTrigger>
        </TabsList>

        <TabsContent value="begleitungen" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Monatsansicht je Kunde</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Kunde</Label>
                <Select value={selectedKundenId ? String(selectedKundenId) : undefined} onValueChange={(v) => setSelectedKundenId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Kunde wählen..." /></SelectTrigger>
                  <SelectContent>
                    {(kunden as any[] ?? []).map((k: any) => (
                      <SelectItem key={k.id} value={String(k.id)}>{k.vorname} {k.nachname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monat</Label>
                <Input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {!selectedKundenId ? (
            <Card><CardContent className="py-10 text-center text-sm text-gray-500">Bitte einen Kunden und Monat auswählen.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Arztbegleitungen</p><p className="text-2xl font-bold text-blue-700">{arztBegleitungen.length}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Einkaufsbegleitungen</p><p className="text-2xl font-bold text-green-700">{einkaufsBegleitungen.length}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Kilometer</p><p className="text-2xl font-bold text-gray-800">{begleitKm.toFixed(1)}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Abrechenbar</p><p className="text-2xl font-bold text-orange-600">{(begleitKm * 0.35).toFixed(2)} €</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Begleitungen im ausgewählten Monat</CardTitle></CardHeader>
                <CardContent>
                  {begleitungen.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">Für diesen Kunden sind in diesem Monat keine Arzt- oder Einkaufsbegleitungen erfasst.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b text-left text-xs text-gray-500"><tr><th className="pb-2 pr-3">Datum</th><th className="pb-2 pr-3">Art</th><th className="pb-2 pr-3">Start → Ziel</th><th className="pb-2 pr-3 text-right">km</th><th className="pb-2 text-right">Betrag</th></tr></thead>
                        <tbody>
                          {begleitungen.map((sf: any) => {
                            const istArzt = /arzt/i.test(String(sf.beschreibung ?? ""));
                            return <tr key={sf.id} className="border-b last:border-0"><td className="py-3 pr-3 whitespace-nowrap">{new Date(sf.datum).toLocaleDateString("de-DE")}</td><td className="py-3 pr-3"><Badge className={istArzt ? "bg-blue-600" : "bg-green-600"}>{istArzt ? "Arztbegleitung" : "Einkaufsbegleitung"}</Badge></td><td className="py-3 pr-3 text-gray-600">{sf.startAdresse || "–"} → {sf.zielAdresse || "–"}</td><td className="py-3 pr-3 text-right">{parseFloat(String(sf.kilometer ?? 0)).toFixed(1)}</td><td className="py-3 text-right font-semibold text-orange-600">{(parseFloat(String(sf.kilometer ?? 0)) * 0.35).toFixed(2)} €</td></tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Erfassen-Tab ── */}
        <TabsContent value="erfassen" className="space-y-4">
          {/* Kunde + Monat wählen */}
          <Card>
            <CardContent className="pt-4 grid grid-cols-2 gap-3">
              <div>
                <Label>Kunde</Label>
                <Select onValueChange={(v) => setSelectedKundenId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Kunde wählen..." /></SelectTrigger>
                  <SelectContent>
                    {(kunden as any[] ?? []).map((k: any) => (
                      <SelectItem key={k.id} value={String(k.id)}>{k.vorname} {k.nachname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monat</Label>
                <Input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {selectedKundenId && (
            <>
              {/* Sonderfahrten */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>🚗 Sonderfahrten</span>
                    <Badge className="bg-orange-500">{sfSumme.toFixed(2)} €</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Datum</Label><Input type="date" value={sfForm.datum} onChange={(e) => setSfForm(f => ({ ...f, datum: e.target.value }))} /></div>
                    <div><Label className="text-xs">Kilometer</Label><Input type="number" step="0.1" placeholder="0.0" value={sfForm.kilometer} onChange={(e) => setSfForm(f => ({ ...f, kilometer: e.target.value }))} /></div>
                    <div><Label className="text-xs">Von (Adresse)</Label><Input placeholder="Startadresse" value={sfForm.startAdresse} onChange={(e) => setSfForm(f => ({ ...f, startAdresse: e.target.value }))} /></div>
                    <div><Label className="text-xs">Nach (Adresse)</Label><Input placeholder="Zieladresse" value={sfForm.zielAdresse} onChange={(e) => setSfForm(f => ({ ...f, zielAdresse: e.target.value }))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Beschreibung</Label><Input placeholder="z.B. Arzttermin" value={sfForm.beschreibung} onChange={(e) => setSfForm(f => ({ ...f, beschreibung: e.target.value }))} /></div>
                  </div>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full"
                    disabled={!sfForm.datum || !sfForm.kilometer || sfMutation.isPending}
                    onClick={() => sfMutation.mutate({ kundenId: selectedKundenId, datum: sfForm.datum, startAdresse: sfForm.startAdresse, zielAdresse: sfForm.zielAdresse, kilometer: parseFloat(sfForm.kilometer), beschreibung: sfForm.beschreibung })}>
                    Sonderfahrt speichern (0,35 €/km)
                  </Button>
                  {(sonderfahrten as any[] ?? []).length > 0 && (
                    <div className="space-y-1 mt-2">
                      {(sonderfahrten as any[]).map((sf: any) => (
                        <div key={sf.id} className="flex justify-between items-center text-sm bg-orange-50 p-2 rounded">
                          <span>{new Date(sf.datum).toLocaleDateString("de-DE")} · {sf.kilometer} km · {sf.beschreibung ?? "–"}</span>
                          <Badge className="bg-orange-400">{(parseFloat(sf.kilometer) * 0.35).toFixed(2)} €</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rechnungspositionen */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>📦 Zusatzleistungen</span>
                    <Badge className="bg-blue-500">{posSumme.toFixed(2)} €</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Kategorie</Label>
                      <Select value={posForm.kategorie} onValueChange={(v) => setPosForm(f => ({ ...f, kategorie: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{KATEGORIEN.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Beschreibung</Label><Input placeholder="z.B. Einkauf Edeka" value={posForm.beschreibung} onChange={(e) => setPosForm(f => ({ ...f, beschreibung: e.target.value }))} /></div>
                    <div><Label className="text-xs">Menge</Label><Input type="number" step="0.01" value={posForm.menge} onChange={(e) => setPosForm(f => ({ ...f, menge: e.target.value }))} /></div>
                    <div><Label className="text-xs">Einzelpreis (€)</Label><Input type="number" step="0.01" placeholder="0.00" value={posForm.einzelpreis} onChange={(e) => setPosForm(f => ({ ...f, einzelpreis: e.target.value }))} /></div>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    disabled={!posForm.beschreibung || !posForm.einzelpreis || posMutation.isPending}
                    onClick={() => posMutation.mutate({ kundenId: selectedKundenId, monat, kategorie: posForm.kategorie as any, beschreibung: posForm.beschreibung, menge: parseFloat(posForm.menge), einzelpreis: parseFloat(posForm.einzelpreis) })}>
                    Position hinzufügen
                  </Button>
                  {(positionen as any[] ?? []).length > 0 && (
                    <div className="space-y-1 mt-2">
                      {(positionen as any[]).map((pos: any) => (
                        <div key={pos.id} className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded">
                          <span>{KATEGORIEN.find(k => k.value === pos.kategorie)?.label ?? pos.kategorie} · {pos.beschreibung}</span>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-400">{(parseFloat(pos.menge) * parseFloat(pos.einzelpreis)).toFixed(2)} €</Badge>
                            <button onClick={() => posDeleteMutation.mutate({ id: pos.id })} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rechnung erstellen */}
              <Card className="border-green-300 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-green-800">Gesamtbetrag: {gesamtVorschau.toFixed(2)} €</p>
                      <p className="text-xs text-gray-500">Sonderfahrten: {sfSumme.toFixed(2)} € + Zusatzleistungen: {posSumme.toFixed(2)} €</p>
                    </div>
                    <Button className="bg-green-700 hover:bg-green-800 text-white"
                      disabled={gesamtVorschau === 0 || rechnungErstellenMutation.isPending}
                      onClick={() => rechnungErstellenMutation.mutate({ kundenId: selectedKundenId, monat })}>
                      {rechnungErstellenMutation.isPending ? "Erstelle..." : "Rechnung erstellen"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Rechnungen-Tab ── */}
        <TabsContent value="rechnungen">
          <Card>
            <CardHeader><CardTitle className="text-base">Alle Privatrechnungen</CardTitle></CardHeader>
            <CardContent>
              {!(rechnungen as any[])?.length ? (
                <p className="text-sm text-gray-400 text-center py-8">Noch keine Rechnungen erstellt</p>
              ) : (
                <div className="space-y-2">
                  {(rechnungen as any[]).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{r.rechnungsnummer}</p>
                        <p className="text-xs text-gray-500">{r.vorname} {r.nachname} · {r.monat}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700">{parseFloat(r.gesamtbetrag).toFixed(2)} €</span>
                        <Select value={r.status} onValueChange={(v) => statusMutation.mutate({ id: r.id, status: v as any })}>
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entwurf">Entwurf</SelectItem>
                            <SelectItem value="versendet">Versendet</SelectItem>
                            <SelectItem value="bezahlt">Bezahlt</SelectItem>
                            <SelectItem value="storniert">Storniert</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge className={`${STATUS_FARBEN[r.status] ?? "bg-gray-400"} text-xs`}>{r.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
