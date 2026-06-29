import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getWeekDates(baseDate: Date) {
  const day = baseDate.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

const statusColor: Record<string, string> = {
  geplant: "bg-blue-100 text-blue-800 border-blue-200",
  aktiv: "bg-yellow-100 text-yellow-800 border-yellow-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
};

export default function Tourenplanung() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDatum, setSelectedDatum] = useState<string | null>(null);
  const [selectedMaId, setSelectedMaId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const { data: touren = [], refetch } = trpc.touren.list.useQuery();
  const { data: mitarbeiterListe = [] } = trpc.admin.mitarbeiterList.useQuery(undefined, { enabled: isAdmin });
  const { data: einsaetze = [] } = trpc.einsaetze.list.useQuery();

  const createMut = trpc.touren.create.useMutation({
    onSuccess: () => {
      toast.success("Tour erstellt!");
      setShowCreate(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMut = trpc.touren.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const addEinsatzMut = trpc.touren.addEinsatz.useMutation({
    onSuccess: () => { toast.success("Einsatz zur Tour hinzugefügt"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function prevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  // Touren nach Datum gruppieren
  const tourenByDatum = useMemo(() => {
    const map: Record<string, any[]> = {};
    (touren as any[]).forEach(t => {
      const d = toDateStr(new Date(t.datum));
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [touren]);

  // Einsätze nach Datum gruppieren (für Zuordnung)
  const einsaetzeByDatum = useMemo(() => {
    const map: Record<string, any[]> = {};
    (einsaetze as any[]).forEach(e => {
      const d = toDateStr(new Date(e.datum));
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [einsaetze]);

  const weekLabel = `${weekDates[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${weekDates[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  return (
    <div className="p-4 pb-28 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">🗺️ Tourenplanung</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 hover:bg-blue-700 text-white">
            {showCreate ? "Abbrechen" : "+ Tour erstellen"}
          </Button>
        )}
      </div>

      {/* Tour erstellen */}
      {showCreate && isAdmin && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-800">Neue Tour planen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Mitarbeiter</label>
              <Select onValueChange={v => setSelectedMaId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {(mitarbeiterListe as any[]).map(ma => (
                    <SelectItem key={ma.id} value={String(ma.id)}>
                      {ma.vorname} {ma.nachname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Datum</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={selectedDatum || ""}
                onChange={e => setSelectedDatum(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (!selectedMaId || !selectedDatum) { toast.error("Bitte Mitarbeiter und Datum wählen."); return; }
                createMut.mutate({ mitarbeiterId: selectedMaId, datum: selectedDatum });
              }}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "Wird erstellt..." : "Tour erstellen"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Wochennavigation */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-xl border border-gray-200 p-2">
        <Button size="sm" variant="ghost" onClick={prevWeek}>‹</Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{weekLabel}</p>
          <button onClick={goToday} className="text-xs text-teal-600 hover:underline">Heute</button>
        </div>
        <Button size="sm" variant="ghost" onClick={nextWeek}>›</Button>
      </div>

      {/* Wochenansicht */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const isToday = toDateStr(new Date()) === dateStr;
          const dayTouren = tourenByDatum[dateStr] || [];
          const dayEinsaetze = einsaetzeByDatum[dateStr] || [];

          return (
            <div
              key={dateStr}
              className={`rounded-lg border p-1.5 min-h-[80px] cursor-pointer transition-colors ${
                isToday ? "bg-teal-50 border-teal-300" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setSelectedDatum(selectedDatum === dateStr ? null : dateStr)}
            >
              <div className="text-center mb-1">
                <p className="text-xs text-gray-500">{WOCHENTAGE[i]}</p>
                <p className={`text-sm font-bold ${isToday ? "text-teal-700" : "text-gray-800"}`}>
                  {date.getDate()}
                </p>
              </div>
              {dayTouren.length > 0 && (
                <div className="space-y-0.5">
                  {dayTouren.slice(0, 2).map((t: any) => (
                    <div key={t.id} className={`text-xs px-1 py-0.5 rounded text-center truncate ${statusColor[t.status] || "bg-gray-100"}`}>
                      {t.mitarbeiterKuerzel || "T"}
                    </div>
                  ))}
                  {dayTouren.length > 2 && (
                    <div className="text-xs text-center text-gray-400">+{dayTouren.length - 2}</div>
                  )}
                </div>
              )}
              {dayEinsaetze.length > 0 && dayTouren.length === 0 && (
                <div className="text-xs text-center text-gray-400">{dayEinsaetze.length} E.</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tagesdetail */}
      {selectedDatum && (
        <Card className="mb-4 border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">
              📅 {new Date(selectedDatum + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(tourenByDatum[selectedDatum] || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Keine Touren für diesen Tag.</p>
            ) : (
              <div className="space-y-3">
                {(tourenByDatum[selectedDatum] || []).map((t: any) => (
                  <div key={t.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">
                        👷 {t.mitarbeiterVorname} {t.mitarbeiterNachname}
                      </p>
                      <Badge className={`text-xs border ${statusColor[t.status] || "bg-gray-100"}`}>
                        {t.status}
                      </Badge>
                    </div>
                    {t.notizen && <p className="text-xs text-gray-500 italic mb-2">{t.notizen}</p>}
                    {isAdmin && t.status !== "abgeschlossen" && (
                      <div className="flex gap-2">
                        {t.status === "geplant" && (
                          <Button
                            size="sm"
                            className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                            onClick={() => updateStatusMut.mutate({ id: t.id, status: "aktiv" })}
                          >
                            Starten
                          </Button>
                        )}
                        {t.status === "aktiv" && (
                          <Button
                            size="sm"
                            className="text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatusMut.mutate({ id: t.id, status: "abgeschlossen" })}
                          >
                            Abschließen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alle Touren Liste */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📋 Alle Touren</CardTitle>
        </CardHeader>
        <CardContent>
          {(touren as any[]).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Noch keine Touren geplant.</p>
          ) : (
            <div className="space-y-2">
              {(touren as any[]).slice(0, 20).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(t.datum).toLocaleDateString("de-DE")} – {t.mitarbeiterVorname} {t.mitarbeiterNachname}
                    </p>
                    {t.notizen && <p className="text-xs text-gray-500">{t.notizen}</p>}
                  </div>
                  <Badge className={`text-xs border ${statusColor[t.status] || "bg-gray-100"}`}>
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
