/**
 * BudgetVerwaltung.tsx – A21–A26: Jahresbudget-Verwaltung, Monatsanzeige,
 * Budgetampel, KI-Empfehlung, Jahresprognose, Optimierungsvorschläge
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

const AMPEL = {
  gruen: { bg: "bg-green-100", text: "text-green-800", dot: "🟢", label: "Im Plan" },
  gelb: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "🟡", label: "Achtung" },
  rot: { bg: "bg-red-100", text: "text-red-800", dot: "🔴", label: "Kritisch" },
  grau: { bg: "bg-gray-100", text: "text-gray-600", dot: "⚪", label: "Kein Budget" },
};

const LEISTUNGSBEREICHE = [
  { value: "45b", label: "§45b – Entlastungsleistungen" },
  { value: "39", label: "§39 – Verhinderungspflege" },
  { value: "45a", label: "§45a – Angebote zur Unterstützung" },
  { value: "privat", label: "Privat" },
  { value: "sonstige", label: "Sonstige" },
];

interface BudgetFormData {
  leistungsbereich: string;
  jahresbudgetEuro: string;
  gueltigAb: string;
  gueltigBis: string;
  stundensatzEuro: string;
  notizen: string;
}

const DEFAULT_FORM: BudgetFormData = {
  leistungsbereich: "45b",
  jahresbudgetEuro: "",
  gueltigAb: `${new Date().getFullYear()}-01-01`,
  gueltigBis: `${new Date().getFullYear()}-12-31`,
  stundensatzEuro: "35.00",
  notizen: "",
};

export default function BudgetVerwaltung() {
  const { user } = useAuth();
  const [selectedKundenId, setSelectedKundenId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BudgetFormData>(DEFAULT_FORM);
  const [showKiEmpfehlung, setShowKiEmpfehlung] = useState(false);

  const utils = trpc.useUtils();

  // Kundenliste
  const { data: kunden } = trpc.kunden.list.useQuery(undefined, {
    select: (d) =>
      (d ?? []).map((k: any) => ({
        id: k.id,
        name: `${k.vorname} ${k.nachname}`,
        pflegegrad: k.pflegegrad,
      })),
  });

  // Budgets für gewählten Kunden
  const { data: budgets, isLoading: budgetsLoading } = trpc.budget.getByKunde.useQuery(
    { kundenId: selectedKundenId! },
    { enabled: !!selectedKundenId },
  );

  // Monatsbudget
  const { data: monatsbudgets } = trpc.budget.getMonatsbudget.useQuery(
    { kundenId: selectedKundenId! },
    { enabled: !!selectedKundenId },
  );

  // Jahresprognose
  const { data: prognose } = trpc.budget.getJahresprognose.useQuery(
    { kundenId: selectedKundenId! },
    { enabled: !!selectedKundenId },
  );

  // Optimierungsvorschläge
  const { data: vorschlaege } = trpc.budget.getOptimierungsvorschlaege.useQuery(
    { kundenId: selectedKundenId! },
    { enabled: !!selectedKundenId },
  );

  // KI-Empfehlung
  const { data: kiEmpfehlung, isLoading: kiLoading, refetch: fetchKi } =
    trpc.budget.getKiEmpfehlung.useQuery(
      { kundenId: selectedKundenId! },
      { enabled: false },
    );

  // Mutations
  const createBudget = trpc.budget.create.useMutation({
    onSuccess: () => {
      toast.success("Jahresbudget angelegt");
      utils.budget.getByKunde.invalidate({ kundenId: selectedKundenId! });
      utils.budget.getMonatsbudget.invalidate({ kundenId: selectedKundenId! });
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBudget = trpc.budget.delete.useMutation({
    onSuccess: () => {
      toast.success("Budget gelöscht");
      utils.budget.getByKunde.invalidate({ kundenId: selectedKundenId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!selectedKundenId) return;
    createBudget.mutate({
      kundenId: selectedKundenId,
      leistungsbereich: form.leistungsbereich as any,
      jahresbudgetCent: Math.round(parseFloat(form.jahresbudgetEuro || "0") * 100),
      gueltigAb: form.gueltigAb,
      gueltigBis: form.gueltigBis,
      stundensatzCent: Math.round(parseFloat(form.stundensatzEuro || "35") * 100),
      notizen: form.notizen || undefined,
    });
  };

  const handleKiEmpfehlung = () => {
    setShowKiEmpfehlung(true);
    fetchKi();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budgetverwaltung</h1>
        <p className="text-sm text-muted-foreground">
          Jahresbudgets, Monatsanzeige, Ampel und KI-Planungsempfehlung
        </p>
      </div>

      {/* Kundenauswahl */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-sm font-medium mb-2 block">Kunde auswählen</label>
          <Select
            value={selectedKundenId?.toString() ?? ""}
            onValueChange={(v) => setSelectedKundenId(parseInt(v))}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Kunde wählen..." />
            </SelectTrigger>
            <SelectContent>
              {(kunden ?? []).map((k: any) => (
                <SelectItem key={k.id} value={k.id.toString()}>
                  {k.name} {k.pflegegrad ? `(PG ${k.pflegegrad})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedKundenId && (
        <>
          {/* Aktionsleiste */}
          <div className="flex gap-2 flex-wrap">
            {user?.role === "admin" && (
              <Button onClick={() => setShowForm(true)}>+ Jahresbudget anlegen</Button>
            )}
            <Button variant="outline" onClick={handleKiEmpfehlung}>
              🤖 KI-Planungsempfehlung
            </Button>
          </div>

          {/* Optimierungsvorschläge */}
          {(vorschlaege ?? []).length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-orange-800">
                  ⚡ Optimierungsvorschläge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(vorschlaege ?? []).map((v, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 ${
                      v.prioritaet === "hoch"
                        ? "bg-red-100 border border-red-200"
                        : v.prioritaet === "mittel"
                          ? "bg-yellow-100 border border-yellow-200"
                          : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <p className="font-medium text-sm">{v.titel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.beschreibung}</p>
                    <Badge
                      variant="outline"
                      className="mt-1 text-xs"
                    >
                      {v.prioritaet === "hoch" ? "🔴 Hoch" : v.prioritaet === "mittel" ? "🟡 Mittel" : "🟢 Niedrig"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Monatsbudget-Übersicht (A22) */}
          {(monatsbudgets ?? []).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Monatsbudget (aktueller Monat)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(monatsbudgets ?? []).map((mb: any) => {
                  const ampel = AMPEL[mb.ampel as keyof typeof AMPEL] ?? AMPEL.grau;
                  return (
                    <Card key={mb.id} className={`border-l-4 ${mb.ampel === "rot" ? "border-l-red-500" : mb.ampel === "gelb" ? "border-l-yellow-500" : "border-l-green-500"}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">§{mb.leistungsbereich}</CardTitle>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ampel.bg} ${ampel.text}`}>
                            {ampel.dot} {ampel.label}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Monatsbudget</p>
                            <p className="font-bold text-lg">
                              {mb.monatsbudgetEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Stunden/Monat</p>
                            <p className="font-bold text-lg">{mb.monatsbudgetStunden} h</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Geplant</p>
                            <p className="font-medium">{mb.geplanteStunden} h</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Restbudget</p>
                            <p className="font-medium text-green-700">
                              {mb.restbudgetEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                            </p>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Jahresverbrauch</span>
                            <span>{mb.verbrauchProzent}%</span>
                          </div>
                          <Progress value={mb.verbrauchProzent} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Jahresprognose (A25) */}
          {(prognose ?? []).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Jahresprognose</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(prognose ?? []).map((p: any, i: number) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">§{p.leistungsbereich}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Ø pro Monat</p>
                          <p className="font-medium">
                            {p.durchschnittProMonatEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prognose Jahresende</p>
                          <p className="font-medium">
                            {p.prognostiziertesJahresendeEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                          </p>
                        </div>
                      </div>
                      <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
                        p.auslastungTyp === "ueberausgelastet"
                          ? "bg-red-100 text-red-800"
                          : p.auslastungTyp === "unterausgelastet"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                      }`}>
                        {p.auslastungTyp === "ueberausgelastet"
                          ? "⚠️ Budget wird überschritten"
                          : p.auslastungTyp === "unterausgelastet"
                            ? "📉 Budget wird nicht ausgeschöpft"
                            : "✅ Budget optimal ausgelastet"}
                        {p.differenzEuro !== 0 && (
                          <span className="ml-1">
                            ({p.differenzEuro > 0 ? "+" : ""}{p.differenzEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })})
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Jahresbudgets-Liste (A21, Admin) */}
          {user?.role === "admin" && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Jahresbudgets verwalten</h2>
              {budgetsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (budgets ?? []).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Noch keine Jahresbudgets für diesen Kunden angelegt.
                    <br />
                    <Button className="mt-3" onClick={() => setShowForm(true)}>
                      Erstes Budget anlegen
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(budgets ?? []).map((b: any) => (
                    <Card key={b.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Leistungsbereich</p>
                              <Badge variant="outline">§{b.leistungsbereich}</Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Jahresbudget</p>
                              <p className="font-bold">
                                {(b.jahresbudgetCent / 100).toLocaleString("de-DE", {
                                  style: "currency",
                                  currency: "EUR",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Verbraucht</p>
                              <p className="font-medium text-orange-600">
                                {(b.verbrauchtCent / 100).toLocaleString("de-DE", {
                                  style: "currency",
                                  currency: "EUR",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Gültig</p>
                              <p className="font-medium">
                                {b.gueltigAb instanceof Date
                                  ? b.gueltigAb.toLocaleDateString("de-DE")
                                  : b.gueltigAb}{" "}
                                –{" "}
                                {b.gueltigBis instanceof Date
                                  ? b.gueltigBis.toLocaleDateString("de-DE")
                                  : b.gueltigBis}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Budget wirklich löschen?")) {
                                deleteBudget.mutate({ id: b.id });
                              }
                            }}
                          >
                            🗑
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Formular-Dialog: Budget anlegen */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jahresbudget anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Leistungsbereich</label>
              <Select
                value={form.leistungsbereich}
                onValueChange={(v) => setForm((f) => ({ ...f, leistungsbereich: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEISTUNGSBEREICHE.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Jahresbudget (€)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="z.B. 3386.00"
                value={form.jahresbudgetEuro}
                onChange={(e) => setForm((f) => ({ ...f, jahresbudgetEuro: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Gültig ab</label>
                <Input
                  type="date"
                  value={form.gueltigAb}
                  onChange={(e) => setForm((f) => ({ ...f, gueltigAb: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Gültig bis</label>
                <Input
                  type="date"
                  value={form.gueltigBis}
                  onChange={(e) => setForm((f) => ({ ...f, gueltigBis: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Stundensatz (€)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="35.00"
                value={form.stundensatzEuro}
                onChange={(e) => setForm((f) => ({ ...f, stundensatzEuro: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notizen (optional)</label>
              <Input
                placeholder="z.B. AOK-Budget 2025"
                value={form.notizen}
                onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!form.jahresbudgetEuro || createBudget.isPending}
              >
                {createBudget.isPending ? <Spinner className="h-4 w-4" /> : "Anlegen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KI-Empfehlung-Dialog */}
      <Dialog open={showKiEmpfehlung} onOpenChange={setShowKiEmpfehlung}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>🤖 KI-Planungsempfehlung</DialogTitle>
          </DialogHeader>
          {kiLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
              <span className="ml-2 text-muted-foreground">KI analysiert Budgets...</span>
            </div>
          ) : kiEmpfehlung ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                {kiEmpfehlung.empfehlung}
              </div>
              {kiEmpfehlung.optimierungen.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Konkrete Potenziale:</p>
                  <div className="space-y-2">
                    {kiEmpfehlung.optimierungen.map((o: any, i: number) => (
                      <div key={i} className="rounded-lg bg-green-50 p-3 text-sm">
                        <p className="font-medium">§{o.leistungsbereich}</p>
                        <p className="text-muted-foreground">{o.hinweis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground italic">
                Diese Empfehlung ist eine unverbindliche KI-Planungshilfe und ersetzt keine Fachberatung.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Keine Empfehlung verfügbar.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
