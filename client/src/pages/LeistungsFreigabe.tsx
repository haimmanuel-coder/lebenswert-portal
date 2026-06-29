import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const paraLabel: Record<string, string> = {
  "45b": "§45b SGB XI",
  "45a": "§45a SGB XI",
  "39": "§39 SGB XI",
};

export default function LeistungsFreigabe() {
  const { data: leistungen = [], refetch } = trpc.admin.leistungenFreigabe.useQuery({ limit: 100 });

  const freigebeMut = trpc.admin.leistungFreigeben.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.aktion === "freigeben" ? "Leistungsnachweis freigegeben ✅" : "Leistungsnachweis zurückgestellt");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const offen = (leistungen as any[]).filter(l => l.status === "offen").length;
  const pruefung = (leistungen as any[]).filter(l => l.status === "pruefung").length;

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">✅ Leistungsnachweis-Freigabe</h1>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="text-center p-3 bg-yellow-50 border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{pruefung}</div>
          <div className="text-xs text-yellow-600">In Prüfung</div>
        </Card>
        <Card className="text-center p-3 bg-gray-50 border-gray-200">
          <div className="text-2xl font-bold text-gray-700">{offen}</div>
          <div className="text-xs text-gray-500">Offen</div>
        </Card>
      </div>

      {leistungen.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">✅</div>
          <p>Keine Leistungsnachweise zur Freigabe vorhanden.</p>
          <p className="text-xs mt-1">Alle Nachweise sind bereits freigegeben oder versendet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(leistungen as any[]).map((l) => (
            <Card key={l.id} className={`border ${l.status === "pruefung" ? "border-yellow-300 bg-yellow-50" : "border-gray-200"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {l.mitarbeiterVorname} {l.mitarbeiterNachname}
                    </p>
                    <p className="text-xs text-gray-600">
                      {l.monat} · {paraLabel[l.paragraph] || l.paragraph}
                    </p>
                    {l.kundenVorname && (
                      <p className="text-xs text-gray-500">
                        Kunde: {l.kundenVorname} {l.kundenNachname}
                      </p>
                    )}
                  </div>
                  <Badge className={`text-xs border ${
                    l.status === "pruefung" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                    "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                    {l.status === "pruefung" ? "In Prüfung" : "Offen"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-sm font-bold text-gray-800">{parseFloat(String(l.stunden || 0)).toFixed(1)}h</p>
                    <p className="text-xs text-gray-400">Stunden</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-sm font-bold text-gray-800">{l.anzahlEinsaetze || 0}</p>
                    <p className="text-xs text-gray-400">Einsätze</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-sm font-bold text-gray-800">{parseFloat(String(l.betrag || 0)).toFixed(2)}€</p>
                    <p className="text-xs text-gray-400">Betrag</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={() => freigebeMut.mutate({ id: l.id, aktion: "freigeben" })}
                    disabled={freigebeMut.isPending}
                  >
                    ✓ Freigeben
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-600 text-xs"
                    onClick={() => freigebeMut.mutate({ id: l.id, aktion: "ablehnen" })}
                    disabled={freigebeMut.isPending}
                  >
                    ↩ Zurückstellen
                  </Button>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Erstellt: {new Date(l.createdAt).toLocaleDateString("de-DE")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
