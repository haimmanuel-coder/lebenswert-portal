import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const typIcon: Record<string, string> = {
  info: "ℹ️",
  warnung: "⚠️",
  erfolg: "✅",
  fehler: "❌",
};

const typColor: Record<string, string> = {
  info: "bg-blue-50 border-blue-200",
  warnung: "bg-yellow-50 border-yellow-200",
  erfolg: "bg-green-50 border-green-200",
  fehler: "bg-red-50 border-red-200",
};

export default function Benachrichtigungen() {
  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30000 });

  const markReadMut = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const markAllMut = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { toast.success("Alle als gelesen markiert"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.notifications.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const deleteGeleseneMut = trpc.notifications.deleteGelesene.useMutation({
    onSuccess: () => { toast.success("Gelesene Benachrichtigungen entfernt"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Das Feld heisst in der Datenbank "gelesen" (boolean).
  const unread = (notifications as any[]).filter(n => !n.gelesen).length;
  const gelesenAnzahl = (notifications as any[]).filter(n => n.gelesen).length;

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">🔔 Benachrichtigungen</h1>
          {unread > 0 && (
            <Badge className="bg-red-500 text-white text-xs">{unread}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending}
              className="text-xs"
            >
              Alle gelesen
            </Button>
          )}
          {gelesenAnzahl > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteGeleseneMut.mutate()}
              disabled={deleteGeleseneMut.isPending}
              className="text-xs text-red-600 border-red-300 hover:bg-red-50"
              title="Bereits gelesene Meldungen entfernen, damit der Arbeitsbereich frei bleibt"
            >
              {gelesenAnzahl} gelesene löschen
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🔕</div>
          <p>Keine Benachrichtigungen vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(notifications as any[]).map((n) => (
            <Card
              key={n.id}
              className={`border transition-all ${typColor[n.typ] || "bg-gray-50 border-gray-200"} ${!n.gelesen ? "shadow-sm" : "opacity-70"}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{typIcon[n.typ] || "📢"}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${!n.gelesen ? "text-gray-900" : "text-gray-600"}`}>
                          {n.titel}
                        </p>
                        {!n.gelesen && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{n.nachricht}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.gelesen && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2"
                        title="Als gelesen markieren"
                        onClick={() => markReadMut.mutate({ id: n.id })}
                        disabled={markReadMut.isPending}
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 px-2 text-red-600 hover:bg-red-50"
                      title="Benachrichtigung löschen"
                      onClick={() => deleteMut.mutate({ id: n.id })}
                      disabled={deleteMut.isPending}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
