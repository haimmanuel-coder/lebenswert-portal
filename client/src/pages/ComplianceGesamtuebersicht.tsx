import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";

const AMPEL_COLOR: Record<string, string> = {
  gruen: "bg-green-500",
  gelb: "bg-yellow-400",
  rot: "bg-red-500",
};

const AMPEL_LABEL: Record<string, string> = {
  gruen: "✅ OK",
  gelb: "⚠️ Bald fällig",
  rot: "🔴 Handlungsbedarf",
};

export default function ComplianceGesamtuebersicht() {
  const { data, isLoading } = trpc.arbeitssicherheit.complianceGesamt.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Spinner className="h-8 w-8" />
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      Keine aktiven Mitarbeiter gefunden.
    </div>
  );

  const gesamt = data.length;
  const ok = data.filter(m => m.ampel === "gruen").length;
  const warn = data.filter(m => m.ampel === "gelb").length;
  const krit = data.filter(m => m.ampel === "rot").length;
  const score = Math.round((ok / gesamt) * 100);

  return (
    <div className="space-y-6">
      {/* KPI-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-green-600">{ok}</div>
            <div className="text-xs text-muted-foreground mt-1">Alles OK</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-yellow-600">{warn}</div>
            <div className="text-xs text-muted-foreground mt-1">Bald fällig</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-red-600">{krit}</div>
            <div className="text-xs text-muted-foreground mt-1">Handlungsbedarf</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-primary">{score}%</div>
            <div className="text-xs text-muted-foreground mt-1">Compliance-Score</div>
            <Progress value={score} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Tabelle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mitarbeiter-Compliance-Übersicht</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">Mitarbeiter</th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                  <th className="text-center px-3 py-2 font-medium">Unterweisungen<br/><span className="font-normal text-xs text-muted-foreground">offen / bald fällig</span></th>
                  <th className="text-center px-3 py-2 font-medium">Vorsorgen<br/><span className="font-normal text-xs text-muted-foreground">überfällig</span></th>
                  <th className="text-center px-3 py-2 font-medium">PSA<br/><span className="font-normal text-xs text-muted-foreground">aktiv</span></th>
                  <th className="text-center px-3 py-2 font-medium">Urlaub<br/><span className="font-normal text-xs text-muted-foreground">Rest / Jahr</span></th>
                </tr>
              </thead>
              <tbody>
                {data
                  .sort((a, b) => {
                    const order = { rot: 0, gelb: 1, gruen: 2 };
                    return (order[a.ampel] ?? 2) - (order[b.ampel] ?? 2);
                  })
                  .map((ma) => (
                    <tr key={ma.mitarbeiterId} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {ma.vorname} {ma.nachname}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${AMPEL_COLOR[ma.ampel] ?? "bg-gray-400"} mr-1`} />
                        <span className="text-xs">{AMPEL_LABEL[ma.ampel]}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {ma.offeneUnterweisungen > 0 ? (
                          <Badge variant="destructive" className="text-xs">{ma.offeneUnterweisungen} offen</Badge>
                        ) : ma.baldFaelligeUnterweisungen > 0 ? (
                          <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">{ma.baldFaelligeUnterweisungen} bald</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">✓</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {ma.ueberfaelligeVorsorgen > 0 ? (
                          <Badge variant="destructive" className="text-xs">{ma.ueberfaelligeVorsorgen} überfällig</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">✓</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {ma.aktivePsaArtikel > 0 ? (
                          <Badge variant="secondary" className="text-xs">{ma.aktivePsaArtikel} Artikel</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-sm font-semibold ${ma.urlaubRest <= 3 ? "text-orange-500" : "text-foreground"}`}>
                            {ma.urlaubRest}
                          </span>
                          <span className="text-xs text-muted-foreground">/ {ma.urlaubJahr} Tage</span>
                          <Progress
                            value={ma.urlaubJahr > 0 ? Math.round((ma.urlaubVerbraucht / ma.urlaubJahr) * 100) : 0}
                            className="h-1 w-16"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
