/**
 * ControllingDashboard.tsx – A27: Admin-Controlling-Dashboard
 * Kennzahlen, Budgetampel-Übersicht, Jahresprognose, KI-Empfehlung
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

const AMPEL_FARBEN = {
  gruen: { bg: "bg-green-100", text: "text-green-800", label: "Im Plan", dot: "🟢" },
  gelb: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Achtung", dot: "🟡" },
  rot: { bg: "bg-red-100", text: "text-red-800", label: "Kritisch", dot: "🔴" },
  grau: { bg: "bg-gray-100", text: "text-gray-600", label: "Kein Budget", dot: "⚪" },
};

export default function ControllingDashboard() {
  const { user } = useAuth();
  const [monatVon, setMonatVon] = useState(() => `${new Date().getFullYear()}-01`);
  const [monatBis, setMonatBis] = useState(() => new Date().toISOString().slice(0, 7));
  const [leistungsbereich, setLeistungsbereich] = useState<string>("alle");
  const [suchtext, setSuchtext] = useState("");

  const { data, isLoading } = trpc.budget.getControllingDaten.useQuery(
    {
      monatVon,
      monatBis,
      leistungsbereich: leistungsbereich as any,
    },
    { enabled: user?.role === "admin" },
  );

  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nur Administratoren haben Zugriff auf das Controlling-Dashboard.
      </div>
    );
  }

  const gefilterteBudgets = (data?.budgets ?? []).filter(
    (b) =>
      !suchtext ||
      b.kundenName.toLowerCase().includes(suchtext.toLowerCase()) ||
      b.leistungsbereich.includes(suchtext),
  );

  const exportCSV = () => {
    const rows = [
      ["Kunde", "Pflegegrad", "Leistungsbereich", "Jahresbudget €", "Verbraucht €", "Rest €", "% verbraucht", "Ampel"],
      ...gefilterteBudgets.map((b) => [
        b.kundenName,
        b.pflegegrad ?? "",
        b.leistungsbereich,
        b.jahresbudgetEuro.toFixed(2),
        b.verbrauchtEuro.toFixed(2),
        b.restEuro.toFixed(2),
        b.verbrauchProzent,
        AMPEL_FARBEN[b.ampel]?.label ?? b.ampel,
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Controlling_${monatVon}_${monatBis}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV-Export erstellt");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Controlling-Dashboard</h1>
          <p className="text-sm text-muted-foreground">Budgetübersicht und Kennzahlen für alle Kunden</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!data}>
          ⬇ CSV-Export
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Zeitraum von</label>
              <Input type="month" value={monatVon} onChange={(e) => setMonatVon(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Zeitraum bis</label>
              <Input type="month" value={monatBis} onChange={(e) => setMonatBis(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Leistungsbereich</label>
              <Select value={leistungsbereich} onValueChange={setLeistungsbereich}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle</SelectItem>
                  <SelectItem value="45b">§45b</SelectItem>
                  <SelectItem value="39">§39</SelectItem>
                  <SelectItem value="45a">§45a</SelectItem>
                  <SelectItem value="privat">Privat</SelectItem>
                  <SelectItem value="sonstige">Sonstige</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kundensuche</label>
              <Input
                placeholder="Name suchen..."
                value={suchtext}
                onChange={(e) => setSuchtext(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : data ? (
        <>
          {/* KPI-Karten */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Gesamtbudget</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.kennzahlen.gesamtJahresbudgetEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Verbraucht</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">
                  {data.kennzahlen.gesamtVerbrauchtEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </p>
                <p className="text-xs text-muted-foreground">{data.kennzahlen.durchschnittVerbrauchProzent}% des Budgets</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Restbudget</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {data.kennzahlen.gesamtRestEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Geplante Stunden</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.kennzahlen.gesamtStunden} h</p>
                <p className="text-xs text-muted-foreground">
                  {data.kennzahlen.abgeschlosseneStunden} h abgeschlossen
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ampel-Verteilung */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budgetampel-Verteilung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(AMPEL_FARBEN).map(([key, val]) => (
                  <div key={key} className={`rounded-lg p-3 ${val.bg}`}>
                    <p className="text-2xl font-bold">{data.ampelVerteilung[key as keyof typeof data.ampelVerteilung]}</p>
                    <p className={`text-sm font-medium ${val.text}`}>{val.dot} {val.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Prognose */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jahresprognose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Prognostiziertes Jahresende</p>
                  <p className="text-xl font-bold">
                    {data.kennzahlen.prognostiziertesJahresendeEuro.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                </div>
                <div className="flex-1">
                  <Progress
                    value={Math.min(
                      100,
                      data.kennzahlen.gesamtJahresbudgetEuro > 0
                        ? (data.kennzahlen.prognostiziertesJahresendeEuro /
                            data.kennzahlen.gesamtJahresbudgetEuro) *
                            100
                        : 0,
                    )}
                    className="h-3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget-Tabelle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Budgetdetails ({gefilterteBudgets.length} Einträge)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunde</TableHead>
                      <TableHead>PG</TableHead>
                      <TableHead>Bereich</TableHead>
                      <TableHead className="text-right">Jahresbudget</TableHead>
                      <TableHead className="text-right">Verbraucht</TableHead>
                      <TableHead className="text-right">Rest</TableHead>
                      <TableHead>Auslastung</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gefilterteBudgets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Keine Budgets im gewählten Zeitraum
                        </TableCell>
                      </TableRow>
                    ) : (
                      gefilterteBudgets.map((b) => {
                        const ampel = AMPEL_FARBEN[b.ampel] ?? AMPEL_FARBEN.grau;
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.kundenName}</TableCell>
                            <TableCell>{b.pflegegrad ? `PG ${b.pflegegrad}` : "–"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">§{b.leistungsbereich}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {b.jahresbudgetEuro.toLocaleString("de-DE", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {b.verbrauchtEuro.toLocaleString("de-DE", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {b.restEuro.toLocaleString("de-DE", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[100px]">
                                <Progress value={b.verbrauchProzent} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-8">
                                  {b.verbrauchProzent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ampel.bg} ${ampel.text}`}
                              >
                                {ampel.dot} {ampel.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center text-muted-foreground py-12">
          Keine Daten verfügbar.
        </div>
      )}
    </div>
  );
}
