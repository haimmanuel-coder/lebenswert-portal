import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
const THEMEN_LABELS: Record<string, string> = {
  notfall_erste_hilfe: "Notfall & Erste Hilfe",
  hygiene_desinfektion: "Hygiene & Desinfektion",
  ergonomie_heben_tragen: "Ergonomie / Heben & Tragen",
  deeskalation_demenz: "Deeskalation bei Demenz",
  verkehrssicherheit: "Verkehrssicherheit",
  psa_verwendung: "PSA-Verwendung",
  alleinarbeit_schutz: "Schutz bei Alleinarbeit",
  biostoff_infektionsschutz: "Biostoff & Infektionsschutz",
  sonstiges: "Sonstiges",
};
const BEREICH_LABELS: Record<string, string> = {
  haushalt_senior: "Haushalt beim Senioren",
  wegeunfall: "Wegeunfall / Dienstfahrt",
  ergonomie_physisch: "Ergonomie & physische Belastung",
  psychisch: "Psychische Belastung",
  hygiene_infektion: "Hygiene & Infektionsschutz",
  sonstiges: "Sonstiges",
};

function formatDate(d: unknown): string {
  if (!d) return "–";
  const s = String(d).split("T")[0];
  if (!s || s === "undefined") return "–";
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function daysUntil(dateStr: unknown): number {
  if (!dateStr) return 9999;
  const d = new Date(String(dateStr).split("T")[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function ampelFromDays(days: number): "gruen" | "gelb" | "rot" {
  if (days < 0) return "rot";
  if (days <= 60) return "gelb";
  return "gruen";
}

// ─── Ampel-Badge ─────────────────────────────────────────────────────────────
function AmpelBadge({ status, label }: { status: "gruen" | "gelb" | "rot"; label?: string }) {
  const cfg = {
    gruen: { bg: "bg-green-100 text-green-800 border-green-300", dot: "bg-green-500", text: label ?? "OK" },
    gelb: { bg: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "bg-yellow-500", text: label ?? "Bald fällig" },
    rot: { bg: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500", text: label ?? "Überfällig" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.bg}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  );
}

// ─── KPI-Karte ───────────────────────────────────────────────────────────────
function KpiCard({
  title, value, sub, color,
}: { title: string; value: number | string; sub?: string; color: "green" | "yellow" | "red" | "blue" | "gray" }) {
  const colors = {
    green: "border-green-400 bg-green-50",
    yellow: "border-yellow-400 bg-yellow-50",
    red: "border-red-400 bg-red-50",
    blue: "border-blue-400 bg-blue-50",
    gray: "border-gray-300 bg-gray-50",
  };
  const textColors = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
    blue: "text-blue-700",
    gray: "text-gray-700",
  };
  return (
    <Card className={`border-l-4 ${colors[color]}`}>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Unterweisung anlegen Dialog ──────────────────────────────────────────────
function UnterweisungAnlegenDialog({
  open, onClose, mitarbeiterList,
}: {
  open: boolean;
  onClose: () => void;
  mitarbeiterList: { id: number; vorname: string; nachname: string }[];
}) {
  const [maId, setMaId] = useState("");
  const [thema, setThema] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const utils = trpc.useUtils();

  const create = trpc.arbeitssicherheit.unterweisung.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Unterweisung erfolgreich angelegt");
      utils.arbeitssicherheit.unterweisung.listAll.invalidate();
      utils.arbeitssicherheit.dashboard.invalidate();
      utils.arbeitssicherheit.complianceGesamt.invalidate();
      onClose();
      setMaId(""); setThema(""); setDatum(new Date().toISOString().split("T")[0]);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🦺 Neue Unterweisung anlegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Mitarbeiter</Label>
            <Select value={maId} onValueChange={setMaId}>
              <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen…" /></SelectTrigger>
              <SelectContent>
                {mitarbeiterList.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.vorname} {m.nachname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Thema</Label>
            <Select value={thema} onValueChange={setThema}>
              <SelectTrigger><SelectValue placeholder="Thema wählen…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(THEMEN_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Datum der Unterweisung</Label>
            <Input type="date" value={datum} onChange={e => setDatum(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
            <Button
              className="flex-1 bg-green-700 hover:bg-green-800 text-white"
              disabled={!maId || !thema || !datum || create.isPending}
              onClick={() => create.mutate({ mitarbeiterId: Number(maId), thema: thema as any, unterweisungsDatum: datum })}
            >
              {create.isPending ? "Speichere…" : "Anlegen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gefährdung anlegen Dialog ────────────────────────────────────────────────
function GefaehrdungAnlegenDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [titel, setTitel] = useState("");
  const [bereich, setBereich] = useState("");
  const [risiko, setRisiko] = useState("");
  const [stufe, setStufe] = useState<"niedrig" | "mittel" | "hoch">("mittel");
  const utils = trpc.useUtils();

  const create = trpc.arbeitssicherheit.gefaehrdung.create.useMutation({
    onSuccess: () => {
      toast.success("Gefährdungsbeurteilung angelegt");
      utils.arbeitssicherheit.gefaehrdung.list.invalidate();
      utils.arbeitssicherheit.dashboard.invalidate();
      onClose();
      setTitel(""); setBereich(""); setRisiko(""); setStufe("mittel");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⚠️ Neue Gefährdungsbeurteilung</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Titel</Label>
            <Input value={titel} onChange={e => setTitel(e.target.value)} placeholder="z.B. Sturzgefahr im Badezimmer" />
          </div>
          <div>
            <Label>Bereich</Label>
            <Select value={bereich} onValueChange={setBereich}>
              <SelectTrigger><SelectValue placeholder="Bereich wählen…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(BEREICH_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Risikobeschreibung</Label>
            <Input value={risiko} onChange={e => setRisiko(e.target.value)} placeholder="Kurze Beschreibung…" />
          </div>
          <div>
            <Label>Risikostufe</Label>
            <Select value={stufe} onValueChange={v => setStufe(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="niedrig">🟢 Niedrig</SelectItem>
                <SelectItem value="mittel">🟡 Mittel</SelectItem>
                <SelectItem value="hoch">🔴 Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!titel || !bereich || !risiko || create.isPending}
              onClick={() => create.mutate({ titel, bereich: bereich as any, risikobeschreibung: risiko, risikoStufe: stufe })}
            >
              {create.isPending ? "Speichere…" : "Anlegen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function ArbeitssicherheitDashboard() {
  const [showUnterweisungDialog, setShowUnterweisungDialog] = useState(false);
  const [showGefaehrdungDialog, setShowGefaehrdungDialog] = useState(false);
  const [suchbegriff, setSuchbegriff] = useState("");

  const { data: kpi, isLoading: kpiLoading } = trpc.arbeitssicherheit.dashboard.useQuery();
  const { data: compliance, isLoading: compLoading } = trpc.arbeitssicherheit.complianceGesamt.useQuery();
  const { data: unterweisungen, isLoading: uwLoading } = trpc.arbeitssicherheit.unterweisung.listAll.useQuery();
  const { data: gefaehrdungen, isLoading: gfLoading } = trpc.arbeitssicherheit.gefaehrdung.list.useQuery();

  // Mitarbeiterliste für Dialoge
  const mitarbeiterList = compliance
    ? compliance.map(c => ({ id: c.mitarbeiterId, vorname: c.vorname, nachname: c.nachname }))
    : [];

  // Ampel-Zähler aus complianceGesamt
  const ampelGruen = compliance?.filter(c => c.ampel === "gruen").length ?? 0;
  const ampelGelb = compliance?.filter(c => c.ampel === "gelb").length ?? 0;
  const ampelRot = compliance?.filter(c => c.ampel === "rot").length ?? 0;

  // Unterweisungen filtern
  const uwGefiltert = (unterweisungen ?? []).filter(u => {
    if (!suchbegriff) return true;
    const name = `${u.maVorname ?? ""} ${u.maNachname ?? ""}`.toLowerCase();
    const thema = (THEMEN_LABELS[u.thema] ?? u.thema).toLowerCase();
    return name.includes(suchbegriff.toLowerCase()) || thema.includes(suchbegriff.toLowerCase());
  });

  // Gefährdungen nach Risikostufe sortieren
  const gefaehrdungenSortiert = [...(gefaehrdungen ?? [])].sort((a, b) => {
    const order = { hoch: 0, mittel: 1, niedrig: 2 };
    return (order[a.risikoStufe as keyof typeof order] ?? 2) - (order[b.risikoStufe as keyof typeof order] ?? 2);
  });

  const utils = trpc.useUtils();
  const gefaehrdungUpdate = trpc.arbeitssicherheit.gefaehrdung.update.useMutation({
    onSuccess: () => {
      utils.arbeitssicherheit.gefaehrdung.list.invalidate();
      utils.arbeitssicherheit.dashboard.invalidate();
      toast.success("Status aktualisiert");
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🦺 Arbeitssicherheits-Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fälligkeiten, Ampelstatus und Gefährdungsbeurteilungen im Überblick</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-800 text-white"
            onClick={() => setShowUnterweisungDialog(true)}
          >
            + Unterweisung
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-orange-400 text-orange-700 hover:bg-orange-50"
            onClick={() => setShowGefaehrdungDialog(true)}
          >
            + Gefährdung
          </Button>
        </div>
      </div>

      {/* KPI-Karten */}
      {kpiLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard title="Offene Unterweisungen" value={kpi?.offeneUnterweisungen ?? 0} color={kpi?.offeneUnterweisungen ? "red" : "green"} sub="nicht bestätigt" />
          <KpiCard title="Offene Gefährdungen" value={kpi?.offeneGefaehrdungen ?? 0} color={kpi?.offeneGefaehrdungen ? "yellow" : "green"} sub="Status: offen" />
          <KpiCard title="Überfällige Vorsorgen" value={kpi?.ueberfaelligeVorsorgen ?? 0} color={kpi?.ueberfaelligeVorsorgen ? "red" : "green"} sub="ArbMedVV" />
          <KpiCard title="Alleinarbeit aktiv" value={kpi?.offeneAlleinarbeit ?? 0} color={kpi?.offeneAlleinarbeit ? "blue" : "gray"} sub="eingecheckt" />
          <KpiCard title="PSA-Ausgaben" value={kpi?.psaAusgabenGesamt ?? 0} color="blue" sub="Gesamt erfasst" />
        </div>
      )}

      {/* Ampel-Übersicht Mitarbeiter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            🚦 Mitarbeiter-Ampelstatus
            <span className="text-xs font-normal text-gray-500">(Unterweisungen + Vorsorgen)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {compLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
          ) : (
            <>
              {/* Ampel-Zusammenfassung */}
              <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm font-medium text-green-700">{ampelGruen} Grün</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                  <span className="text-sm font-medium text-yellow-700">{ampelGelb} Gelb</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span className="text-sm font-medium text-red-700">{ampelRot} Rot</span>
                </div>
              </div>
              {/* Mitarbeiter-Tabelle */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 pr-4 font-medium">Mitarbeiter</th>
                      <th className="text-center py-2 px-3 font-medium">Ampel</th>
                      <th className="text-center py-2 px-3 font-medium">Offene UW</th>
                      <th className="text-center py-2 px-3 font-medium">Bald fällig</th>
                      <th className="text-center py-2 px-3 font-medium">Überfäll. Vorsorge</th>
                      <th className="text-center py-2 px-3 font-medium">PSA aktiv</th>
                      <th className="text-center py-2 px-3 font-medium">Urlaub Rest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compliance ?? [])
                      .sort((a, b) => {
                        const order = { rot: 0, gelb: 1, gruen: 2 };
                        return order[a.ampel] - order[b.ampel];
                      })
                      .map(ma => (
                        <tr key={ma.mitarbeiterId} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-gray-900">
                            {ma.vorname} {ma.nachname}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <AmpelBadge status={ma.ampel} />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {ma.offeneUnterweisungen > 0
                              ? <span className="text-red-600 font-bold">{ma.offeneUnterweisungen}</span>
                              : <span className="text-green-600">✓</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {ma.baldFaelligeUnterweisungen > 0
                              ? <span className="text-yellow-600 font-semibold">{ma.baldFaelligeUnterweisungen}</span>
                              : <span className="text-gray-400">–</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {ma.ueberfaelligeVorsorgen > 0
                              ? <span className="text-red-600 font-bold">{ma.ueberfaelligeVorsorgen}</span>
                              : <span className="text-green-600">✓</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-600">{ma.aktivePsaArtikel}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={ma.urlaubRest <= 3 ? "text-orange-600 font-semibold" : "text-gray-600"}>
                              {ma.urlaubRest}/{ma.urlaubJahr}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {(!compliance || compliance.length === 0) && (
                      <tr><td colSpan={7} className="py-8 text-center text-gray-400">Keine Mitarbeiterdaten vorhanden</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Unterweisungen + Gefährdungen */}
      <Tabs defaultValue="unterweisungen">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="unterweisungen">🦺 Unterweisungen</TabsTrigger>
          <TabsTrigger value="gefaehrdungen">⚠️ Gefährdungen</TabsTrigger>
        </TabsList>

        {/* Tab: Unterweisungen */}
        <TabsContent value="unterweisungen" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Alle Unterweisungen</CardTitle>
                <Input
                  placeholder="Name oder Thema suchen…"
                  value={suchbegriff}
                  onChange={e => setSuchbegriff(e.target.value)}
                  className="max-w-xs text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {uwLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2 pr-4 font-medium">Mitarbeiter</th>
                        <th className="text-left py-2 pr-4 font-medium">Thema</th>
                        <th className="text-left py-2 pr-4 font-medium">Datum</th>
                        <th className="text-left py-2 pr-4 font-medium">Nächste Fälligkeit</th>
                        <th className="text-center py-2 px-3 font-medium">Status</th>
                        <th className="text-center py-2 px-3 font-medium">Ampel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uwGefiltert
                        .sort((a, b) => {
                          const da = daysUntil(a.naechsteFaelligkeit);
                          const db2 = daysUntil(b.naechsteFaelligkeit);
                          return da - db2;
                        })
                        .map(uw => {
                          const days = daysUntil(uw.naechsteFaelligkeit);
                          const ampel = uw.bestaetigt ? ampelFromDays(days) : "rot";
                          return (
                            <tr key={uw.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="py-2.5 pr-4 font-medium text-gray-900">
                                {uw.maVorname} {uw.maNachname}
                              </td>
                              <td className="py-2.5 pr-4 text-gray-700">
                                {THEMEN_LABELS[uw.thema] ?? uw.thema}
                              </td>
                              <td className="py-2.5 pr-4 text-gray-600">{formatDate(uw.unterweisungsDatum)}</td>
                              <td className="py-2.5 pr-4 text-gray-600">
                                {uw.naechsteFaelligkeit ? (
                                  <span className={days < 0 ? "text-red-600 font-semibold" : days <= 60 ? "text-yellow-600 font-semibold" : "text-gray-600"}>
                                    {formatDate(uw.naechsteFaelligkeit)}
                                    {days < 0 && <span className="ml-1 text-xs">({Math.abs(days)}d überfällig)</span>}
                                    {days >= 0 && days <= 60 && <span className="ml-1 text-xs">({days}d)</span>}
                                  </span>
                                ) : "–"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {uw.bestaetigt
                                  ? <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">✓ Bestätigt</Badge>
                                  : <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Ausstehend</Badge>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <AmpelBadge status={ampel} label={ampel === "gruen" ? "OK" : ampel === "gelb" ? "Bald" : "Kritisch"} />
                              </td>
                            </tr>
                          );
                        })}
                      {uwGefiltert.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-gray-400">
                          {suchbegriff ? "Keine Treffer für diese Suche" : "Noch keine Unterweisungen erfasst"}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gefährdungsbeurteilungen */}
        <TabsContent value="gefaehrdungen" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Gefährdungsbeurteilungen</CardTitle>
            </CardHeader>
            <CardContent>
              {gfLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
              ) : (
                <div className="space-y-3">
                  {gefaehrdungenSortiert.map(gf => {
                    const risikoColor = gf.risikoStufe === "hoch" ? "border-red-400 bg-red-50" : gf.risikoStufe === "mittel" ? "border-yellow-400 bg-yellow-50" : "border-green-400 bg-green-50";
                    const risikoText = gf.risikoStufe === "hoch" ? "🔴 Hoch" : gf.risikoStufe === "mittel" ? "🟡 Mittel" : "🟢 Niedrig";
                    const statusColor = gf.status === "erledigt" ? "bg-green-100 text-green-800" : gf.status === "in_bearbeitung" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800";
                    const statusLabel = gf.status === "erledigt" ? "✓ Erledigt" : gf.status === "in_bearbeitung" ? "In Bearbeitung" : "Offen";
                    return (
                      <div key={gf.id} className={`border-l-4 rounded-lg p-4 ${risikoColor}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{gf.titel}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">{BEREICH_LABELS[gf.bereich] ?? gf.bereich}</span>
                              {" · "}Risiko: {risikoText}
                            </p>
                            {gf.risikobeschreibung && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{gf.risikobeschreibung}</p>
                            )}
                            {gf.naechstePruefung && (
                              <p className="text-xs text-gray-500 mt-1">
                                Nächste Prüfung: <span className={daysUntil(gf.naechstePruefung) < 0 ? "text-red-600 font-semibold" : ""}>{formatDate(gf.naechstePruefung)}</span>
                              </p>
                            )}
                          </div>
                          {gf.status !== "erledigt" && (
                            <div className="flex gap-1.5 shrink-0">
                              {gf.status === "offen" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => gefaehrdungUpdate.mutate({ id: gf.id, status: "in_bearbeitung" })}
                                >
                                  In Bearbeitung
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-green-400 text-green-700 hover:bg-green-50"
                                onClick={() => gefaehrdungUpdate.mutate({ id: gf.id, status: "erledigt" })}
                              >
                                ✓ Erledigt
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {gefaehrdungenSortiert.length === 0 && (
                    <div className="py-8 text-center text-gray-400">Noch keine Gefährdungsbeurteilungen erfasst</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialoge */}
      <UnterweisungAnlegenDialog
        open={showUnterweisungDialog}
        onClose={() => setShowUnterweisungDialog(false)}
        mitarbeiterList={mitarbeiterList}
      />
      <GefaehrdungAnlegenDialog
        open={showGefaehrdungDialog}
        onClose={() => setShowGefaehrdungDialog(false)}
      />
    </div>
  );
}
