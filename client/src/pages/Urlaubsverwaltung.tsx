import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  beantragt: "bg-yellow-100 text-yellow-800 border-yellow-200",
  genehmigt: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
};

const statusLabel: Record<string, string> = {
  beantragt: "Beantragt",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
};

export default function Urlaubsverwaltung() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  const { data: antraege = [], refetch } = trpc.urlaub.list.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [notizen, setNotizen] = useState("");

  const createMut = trpc.urlaub.create.useMutation({
    onSuccess: () => {
      toast.success("Urlaubsantrag eingereicht!");
      setShowForm(false);
      setVon(""); setBis(""); setNotizen("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.urlaub.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.urlaub.delete.useMutation({
    onSuccess: () => { toast.success("🗑️ Urlaubsantrag wurde gelöscht"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function calcTage(von: string, bis: string) {
    if (!von || !bis) return 0;
    const d1 = new Date(von), d2 = new Date(bis);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
  }

  function handleSubmit() {
    if (!von || !bis) { toast.error("Bitte Von- und Bis-Datum angeben."); return; }
    if (new Date(bis) < new Date(von)) { toast.error("Das Bis-Datum darf nicht vor dem Von-Datum liegen."); return; }
    createMut.mutate({ von, bis, tage: calcTage(von, bis), notizen: notizen || undefined });
  }

  const offen = antraege.filter((a: any) => a.status === "beantragt").length;
  const genehmigt = antraege.filter((a: any) => a.status === "genehmigt").length;

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">🏖️ Urlaubsverwaltung</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white">
          {showForm ? "Abbrechen" : "+ Antrag stellen"}
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-gray-800">{antraege.length}</div>
          <div className="text-xs text-gray-500">Gesamt</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-yellow-600">{offen}</div>
          <div className="text-xs text-gray-500">Offen</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-green-600">{genehmigt}</div>
          <div className="text-xs text-gray-500">Genehmigt</div>
        </Card>
      </div>

      {/* Formular */}
      {showForm && (
        <Card className="mb-4 border-teal-200 bg-teal-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Neuer Urlaubsantrag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Von</Label>
                <Input type="date" value={von} onChange={e => setVon(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bis</Label>
                <Input type="date" value={bis} onChange={e => setBis(e.target.value)} />
              </div>
            </div>
            {von && bis && (
              <p className="text-sm text-teal-700 font-medium">
                📅 {calcTage(von, bis)} Urlaubstag{calcTage(von, bis) !== 1 ? "e" : ""}
              </p>
            )}
            <div>
              <Label className="text-xs">Notizen (optional)</Label>
              <Textarea
                placeholder="z.B. Familienurlaub, bereits geplante Reise..."
                value={notizen}
                onChange={e => setNotizen(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSubmit}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "Wird eingereicht..." : "Antrag einreichen"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Anträge-Liste */}
      {antraege.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🏖️</div>
          <p>Noch keine Urlaubsanträge vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(antraege as any[]).map((a) => (
            <Card key={a.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {isAdmin && (
                      <p className="text-sm font-semibold text-gray-800">
                        {a.mitarbeiterVorname} {a.mitarbeiterNachname}
                      </p>
                    )}
                    <p className="text-sm text-gray-700">
                      📅 {new Date(a.von).toLocaleDateString("de-DE")} – {new Date(a.bis).toLocaleDateString("de-DE")}
                    </p>
                    <p className="text-xs text-gray-500">{a.tage} Tag{a.tage !== 1 ? "e" : ""}</p>
                  </div>
                  <Badge className={`text-xs border ${statusColor[a.status] || "bg-gray-100 text-gray-600"}`}>
                    {statusLabel[a.status] || a.status}
                  </Badge>
                </div>
                {a.notizen && (
                  <p className="text-xs text-gray-500 italic mb-2">"{a.notizen}"</p>
                )}
                {a.adminNotiz && (
                  <p className="text-xs text-blue-600 mb-2">Admin: {a.adminNotiz}</p>
                )}
                {/* Admin-Aktionen */}
                {isAdmin && a.status === "beantragt" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      onClick={() => updateMut.mutate({ id: a.id, status: "genehmigt" })}
                      disabled={updateMut.isPending}
                    >
                      ✓ Genehmigen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 text-xs"
                      onClick={() => updateMut.mutate({ id: a.id, status: "abgelehnt" })}
                      disabled={updateMut.isPending}
                    >
                      ✗ Ablehnen
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    Eingereicht: {new Date(a.createdAt).toLocaleDateString("de-DE")}
                  </p>
                  {(a.status === "beantragt" || isAdmin) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-300 hover:bg-red-50 h-7 px-2"
                      onClick={() => {
                        if (confirm("Urlaubsantrag wirklich löschen?")) deleteMut.mutate({ id: a.id });
                      }}
                      disabled={deleteMut.isPending}
                    >
                      🗑️ Löschen
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
