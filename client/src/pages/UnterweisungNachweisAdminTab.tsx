/**
 * ════════════════════════════════════════════════════════════════════════════
 *  UNTERWEISUNGS-NACHWEIS – ADMIN-TAB
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Verwaltung rechtssicherer digitaler Unterweisungen:
 *  - Vorlagen anlegen / bearbeiten / deaktivieren
 *  - Unterweisung an Mitarbeiter senden
 *  - Bestätigungs-Status überwachen
 *  - PDF-Nachweis herunterladen
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const THEMEN: Record<string, string> = {
  notfall_erste_hilfe: "🚨 Notfall & Erste Hilfe",
  hygiene_desinfektion: "🧴 Hygiene & Desinfektion",
  ergonomie_heben_tragen: "💪 Ergonomie: Heben & Tragen",
  deeskalation_demenz: "🧠 Deeskalation bei Demenz",
  verkehrssicherheit: "🚗 Verkehrssicherheit",
  psa_verwendung: "🦺 PSA-Verwendung",
  alleinarbeit_schutz: "👤 Schutz bei Alleinarbeit",
  biostoff_infektionsschutz: "🦠 Biologische Arbeitsstoffe",
  sonstiges: "📋 Sonstiges",
};

type ThemaKey = keyof typeof THEMEN;

export default function UnterweisungNachweisAdminTab() {
  const [activeTab, setActiveTab] = useState<"vorlagen" | "senden" | "nachweise">("vorlagen");

  // ── Vorlagen ──────────────────────────────────────────────────────────────
  const { data: vorlagen = [], refetch: refetchVorlagen } = (trpc as any).unterweisungNachweis.vorlagen.listAlle.useQuery();
  const createVorlage = (trpc as any).unterweisungNachweis.vorlagen.create.useMutation({
    onSuccess: () => { toast.success("Vorlage gespeichert"); refetchVorlagen(); setVorlagenDialog(false); resetVorlagenForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateVorlage = (trpc as any).unterweisungNachweis.vorlagen.update.useMutation({
    onSuccess: () => { toast.success("Vorlage aktualisiert"); refetchVorlagen(); setVorlagenDialog(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteVorlage = (trpc as any).unterweisungNachweis.vorlagen.delete.useMutation({
    onSuccess: () => { toast.success("Vorlage deaktiviert"); refetchVorlagen(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [vorlagenDialog, setVorlagenDialog] = useState(false);
  const [editVorlage, setEditVorlage] = useState<any>(null);
  const [vTitel, setVTitel] = useState("");
  const [vThema, setVThema] = useState<ThemaKey>("sonstiges");
  const [vInhalt, setVInhalt] = useState("");
  const [vVersion, setVVersion] = useState("1.0");
  const [vPflicht, setVPflicht] = useState(true);
  const [vGueltigBis, setVGueltigBis] = useState("");

  function resetVorlagenForm() {
    setEditVorlage(null); setVTitel(""); setVThema("sonstiges");
    setVInhalt(""); setVVersion("1.0"); setVPflicht(true); setVGueltigBis("");
  }
  function openEdit(v: any) {
    setEditVorlage(v); setVTitel(v.titel); setVThema(v.thema);
    setVInhalt(v.inhalt); setVVersion(v.version); setVPflicht(v.pflicht);
    setVGueltigBis(v.gueltigBis ?? ""); setVorlagenDialog(true);
  }
  function saveVorlage() {
    if (!vTitel.trim() || !vInhalt.trim()) { toast.error("Titel und Inhalt sind Pflichtfelder"); return; }
    if (editVorlage) {
      updateVorlage.mutate({ id: editVorlage.id, titel: vTitel, inhalt: vInhalt, version: vVersion, pflicht: vPflicht, gueltigBis: vGueltigBis || null });
    } else {
      createVorlage.mutate({ titel: vTitel, thema: vThema, inhalt: vInhalt, version: vVersion, pflicht: vPflicht, gueltigBis: vGueltigBis || undefined });
    }
  }

  // ── Senden ────────────────────────────────────────────────────────────────
  const { data: allMa = [] } = (trpc as any).mitarbeiter.list.useQuery();
  const anMaSenden = (trpc as any).unterweisungNachweis.anMitarbeiterSenden.useMutation({
    onSuccess: (r: any) => { toast.success(`Unterweisung an ${r.anzahl} Mitarbeiter gesendet`); setSendDialog(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const [sendDialog, setSendDialog] = useState(false);
  const [sendVorlagenId, setSendVorlagenId] = useState<number | null>(null);
  const [sendMaIds, setSendMaIds] = useState<number[]>([]);
  const [sendDatum, setSendDatum] = useState(new Date().toISOString().split("T")[0]);

  function toggleMa(id: number) {
    setSendMaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function alleToggle() {
    const aktive = (allMa as any[]).filter((m: any) => m.aktiv !== 0);
    setSendMaIds(sendMaIds.length === aktive.length ? [] : aktive.map((m: any) => m.id));
  }
  function doSenden() {
    if (!sendVorlagenId) { toast.error("Bitte Vorlage wählen"); return; }
    if (sendMaIds.length === 0) { toast.error("Bitte mindestens einen Mitarbeiter wählen"); return; }
    anMaSenden.mutate({ vorlagenId: sendVorlagenId, mitarbeiterIds: sendMaIds, unterweisungsDatum: sendDatum });
  }

  // ── Nachweise ─────────────────────────────────────────────────────────────
  const { data: unterweisungen = [] } = (trpc as any).arbeitssicherheit.unterweisung.listAll.useQuery();
  const adminGetNachweis = (trpc as any).unterweisungNachweis.adminGetNachweis.useMutation({
    onSuccess: (data: any) => {
      if (data?.signedPdfUrl) {
        window.open(data.signedPdfUrl, "_blank");
      } else {
        toast.error("Kein PDF-Nachweis vorhanden");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const aktiveVorlagen = (vorlagen as any[]).filter((v: any) => v.aktiv);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">📜 Unterweisungs-Nachweise</h3>
          <p className="text-sm text-gray-500">Rechtssichere digitale Unterweisungen gemäß §12 ArbSchG mit Unterschrift und S3-Aufbewahrung</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vorlagen">📋 Vorlagen ({aktiveVorlagen.length})</TabsTrigger>
          <TabsTrigger value="senden">📤 Senden</TabsTrigger>
          <TabsTrigger value="nachweise">✅ Nachweise</TabsTrigger>
        </TabsList>

        {/* ── Vorlagen-Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="vorlagen" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { resetVorlagenForm(); setVorlagenDialog(true); }}
              className="bg-green-700 hover:bg-green-800 text-white">
              + Neue Vorlage
            </Button>
          </div>
          {(vorlagen as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400">Noch keine Vorlagen vorhanden</div>
          ) : (
            <div className="space-y-2">
              {(vorlagen as any[]).map((v: any) => (
                <div key={v.id} className={`border rounded-lg p-4 ${!v.aktiv ? "opacity-50 bg-gray-50" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{v.titel}</span>
                        <Badge variant="outline" className="text-xs">{THEMEN[v.thema as ThemaKey] ?? v.thema}</Badge>
                        <Badge variant="outline" className="text-xs">v{v.version}</Badge>
                        {v.pflicht && <Badge className="bg-red-100 text-red-700 text-xs">Pflicht</Badge>}
                        {!v.aktiv && <Badge className="bg-gray-200 text-gray-500 text-xs">Deaktiviert</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.inhalt?.replace(/^#{1,3}\s+/gm, "").replace(/\*\*/g, "")}</p>
                      {v.gueltigBis && (
                        <p className="text-xs text-orange-600 mt-1">Gültig bis: {new Date(v.gueltigBis).toLocaleDateString("de-DE")}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(v)}>✏️</Button>
                      {v.aktiv && (
                        <Button size="sm" variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => { if (confirm("Vorlage deaktivieren?")) deleteVorlage.mutate({ id: v.id }); }}>
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Senden-Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="senden" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium">📤 Unterweisung an Mitarbeiter senden</p>
            <p className="text-xs text-blue-600 mt-1">Die Mitarbeiter erhalten die Unterweisung in ihrem Portal und müssen sie digital bestätigen und unterschreiben.</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Vorlage wählen *</Label>
              <Select onValueChange={(v) => setSendVorlagenId(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Vorlage auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {aktiveVorlagen.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {THEMEN[v.thema as ThemaKey] ?? v.thema} – {v.titel} (v{v.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Unterweisungsdatum *</Label>
              <Input type="date" value={sendDatum} onChange={e => setSendDatum(e.target.value)} className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Mitarbeiter auswählen *</Label>
                <Button size="sm" variant="outline" onClick={alleToggle}>
                  {sendMaIds.length === (allMa as any[]).filter((m: any) => m.aktiv !== 0).length ? "Alle abwählen" : "Alle auswählen"}
                </Button>
              </div>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {(allMa as any[]).filter((m: any) => m.aktiv !== 0).map((ma: any) => (
                  <label key={ma.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={sendMaIds.includes(ma.id)}
                      onChange={() => toggleMa(ma.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{ma.vorname} {ma.nachname}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{ma.beschaeftigungsart ?? "–"}</Badge>
                  </label>
                ))}
              </div>
              {sendMaIds.length > 0 && (
                <p className="text-xs text-green-700 mt-1">{sendMaIds.length} Mitarbeiter ausgewählt</p>
              )}
            </div>
            <Button
              onClick={doSenden}
              disabled={anMaSenden.isPending || !sendVorlagenId || sendMaIds.length === 0}
              className="w-full bg-green-700 hover:bg-green-800 text-white"
            >
              {anMaSenden.isPending ? "Wird gesendet..." : `📤 Unterweisung an ${sendMaIds.length} Mitarbeiter senden`}
            </Button>
          </div>
        </TabsContent>

        {/* ── Nachweise-Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="nachweise" className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              ✅ <strong>{(unterweisungen as any[]).filter((u: any) => u.bestaetigt).length}</strong> bestätigt &nbsp;|&nbsp;
              ⏳ <strong>{(unterweisungen as any[]).filter((u: any) => !u.bestaetigt).length}</strong> ausstehend
            </p>
          </div>
          {(unterweisungen as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400">Noch keine Unterweisungen versendet</div>
          ) : (
            <div className="space-y-2">
              {(unterweisungen as any[]).map((u: any) => (
                <div key={u.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{u.maVorname} {u.maNachname}</span>
                        <Badge variant="outline" className="text-xs">{THEMEN[u.thema as ThemaKey] ?? u.thema}</Badge>
                        {u.bestaetigt ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">✅ Bestätigt</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs">⏳ Ausstehend</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Datum: {u.unterweisungsDatum ? new Date(u.unterweisungsDatum).toLocaleDateString("de-DE") : "–"}
                        {u.bestaetigtAm && ` · Bestätigt: ${new Date(u.bestaetigtAm).toLocaleDateString("de-DE")}`}
                      </p>
                    </div>
                    {u.bestaetigt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50 shrink-0"
                        onClick={() => adminGetNachweis.mutate({ unterweisungId: u.id, mitarbeiterId: u.mitarbeiterId })}
                        disabled={adminGetNachweis.isPending}
                      >
                        📄 PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Vorlagen-Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={vorlagenDialog} onOpenChange={setVorlagenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVorlage ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Titel *</Label>
              <Input value={vTitel} onChange={e => setVTitel(e.target.value)} placeholder="z.B. Hygiene-Unterweisung 2024" className="mt-1" />
            </div>
            {!editVorlage && (
              <div>
                <Label className="text-sm font-medium">Thema *</Label>
                <Select value={vThema} onValueChange={(v) => setVThema(v as ThemaKey)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(THEMEN).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Version</Label>
                <Input value={vVersion} onChange={e => setVVersion(e.target.value)} placeholder="1.0" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Gültig bis</Label>
                <Input type="date" value={vGueltigBis} onChange={e => setVGueltigBis(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={vPflicht} onCheckedChange={setVPflicht} />
              <Label className="text-sm">Pflichtunterweisung</Label>
            </div>
            <div>
              <Label className="text-sm font-medium">Inhalt * (Markdown wird unterstützt)</Label>
              <Textarea
                value={vInhalt}
                onChange={e => setVInhalt(e.target.value)}
                placeholder="# Unterweisungsinhalt&#10;&#10;## Rechtliche Grundlage&#10;..."
                rows={12}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Tipp: # Überschrift 1, ## Überschrift 2, **fett**, - Aufzählung</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVorlagenDialog(false)}>Abbrechen</Button>
            <Button
              onClick={saveVorlage}
              disabled={createVorlage.isPending || updateVorlage.isPending}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              {createVorlage.isPending || updateVorlage.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
