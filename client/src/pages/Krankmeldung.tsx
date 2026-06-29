import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Krankmeldung() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  const { data: meldungen = [], refetch } = trpc.krank.list.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [von, setVon] = useState(new Date().toISOString().split("T")[0]);
  const [bis, setBis] = useState("");
  const [notizen, setNotizen] = useState("");
  const [auAttest, setAuAttest] = useState(false);

  const createMut = trpc.krank.create.useMutation({
    onSuccess: () => {
      toast.success("Krankmeldung erfolgreich eingereicht!");
      setShowForm(false);
      setVon(new Date().toISOString().split("T")[0]);
      setBis(""); setNotizen(""); setAuAttest(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!von) { toast.error("Bitte Startdatum angeben."); return; }
    createMut.mutate({
      von,
      bis: bis || undefined,
      notizen: notizen || undefined,
      auAttest,
    });
  }

  const heute = meldungen.filter((m: any) => {
    const vonDate = new Date(m.von);
    const bisDate = m.bis ? new Date(m.bis) : new Date();
    const now = new Date();
    return vonDate <= now && bisDate >= now;
  }).length;

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">🤒 Krankmeldungen</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-red-600 hover:bg-red-700 text-white">
          {showForm ? "Abbrechen" : "+ Krank melden"}
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-gray-800">{meldungen.length}</div>
          <div className="text-xs text-gray-500">Gesamt</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-red-600">{heute}</div>
          <div className="text-xs text-gray-500">Aktuell krank</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-orange-600">
            {meldungen.filter((m: any) => m.auAttest).length}
          </div>
          <div className="text-xs text-gray-500">Mit AU-Attest</div>
        </Card>
      </div>

      {/* Formular */}
      {showForm && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-800">Krankmeldung einreichen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Krank ab</Label>
                <Input type="date" value={von} onChange={e => setVon(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Voraussichtlich bis (optional)</Label>
                <Input type="date" value={bis} onChange={e => setBis(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200">
              <Switch checked={auAttest} onCheckedChange={setAuAttest} />
              <div>
                <p className="text-sm font-medium text-gray-800">AU-Attest vorhanden</p>
                <p className="text-xs text-gray-500">Ärztliche Bescheinigung liegt vor</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notizen (optional)</Label>
              <Textarea
                placeholder="z.B. Erkältung, Arzttermin vereinbart..."
                value={notizen}
                onChange={e => setNotizen(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSubmit}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "Wird eingereicht..." : "Krankmeldung einreichen"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      {meldungen.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">💪</div>
          <p>Keine Krankmeldungen vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(meldungen as any[]).map((m) => (
            <Card key={m.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    {isAdmin && (
                      <p className="text-sm font-semibold text-gray-800">
                        {m.mitarbeiterVorname} {m.mitarbeiterNachname}
                      </p>
                    )}
                    <p className="text-sm text-gray-700">
                      🤒 Ab {new Date(m.von).toLocaleDateString("de-DE")}
                      {m.bis && ` bis ${new Date(m.bis).toLocaleDateString("de-DE")}`}
                    </p>
                    {m.tage && (
                      <p className="text-xs text-gray-500">{m.tage} Tag{m.tage !== 1 ? "e" : ""}</p>
                    )}
                  </div>
                  {m.auAttest && (
                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                      AU-Attest
                    </Badge>
                  )}
                </div>
                {m.notizen && (
                  <p className="text-xs text-gray-500 italic">{m.notizen}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Gemeldet: {new Date(m.createdAt).toLocaleDateString("de-DE")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
