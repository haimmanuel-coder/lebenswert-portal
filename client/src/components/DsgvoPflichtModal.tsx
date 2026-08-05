import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CheckCircle, FileText, AlertTriangle } from "lucide-react";

interface OffenesDokument {
  id: number;
  titel: string;
  version: string;
  typ: string;
  inhalt: string;
}

interface DsgvoPflichtModalProps {
  offeneDokumente: OffenesDokument[];
  onAlleBestaetigt: () => void;
}

export function DsgvoPflichtModal({ offeneDokumente, onAlleBestaetigt }: DsgvoPflichtModalProps) {
  const [aktuellerIndex, setAktuellerIndex] = useState(0);
  const [bestaetigt, setBestaetigt] = useState<Set<number>>(new Set());
  const [gelesen, setGelesen] = useState(false);

  const utils = trpc.useUtils();
  const zustimmenMutation = trpc.datenschutz.zustimmen.useMutation({
    onSuccess: () => {
      const aktuellesDok = offeneDokumente[aktuellerIndex];
      const neueBestaetigt = new Set(bestaetigt);
      neueBestaetigt.add(aktuellesDok.id);
      setBestaetigt(neueBestaetigt);

      if (aktuellerIndex < offeneDokumente.length - 1) {
        setAktuellerIndex(aktuellerIndex + 1);
        setGelesen(false);
      } else {
        // Alle bestätigt
        utils.datenschutz.checkPflichtZustimmungen.invalidate();
        utils.datenschutz.getMeineZustimmungen.invalidate();
        toast.success("Alle Datenschutzdokumente bestätigt. Willkommen im Portal!");
        onAlleBestaetigt();
      }
    },
    onError: (err) => {
      toast.error("Fehler beim Speichern: " + err.message);
    },
  });

  if (offeneDokumente.length === 0) return null;

  const aktuellesDok = offeneDokumente[aktuellerIndex];
  const fortschritt = Math.round((aktuellerIndex / offeneDokumente.length) * 100);

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl w-full"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-muted-foreground font-medium">
              Zustimmung erforderlich ({aktuellerIndex + 1} von {offeneDokumente.length})
            </span>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {aktuellesDok.titel}
          </DialogTitle>
          <DialogDescription>
            Version {aktuellesDok.version} · Bitte lesen Sie das Dokument vollständig und bestätigen Sie Ihre Zustimmung.
          </DialogDescription>
        </DialogHeader>

        {/* Fortschrittsbalken */}
        <div className="w-full bg-muted rounded-full h-2 mb-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${fortschritt}%` }}
          />
        </div>

        {/* Dokument-Inhalt */}
        <ScrollArea
          className="h-64 border rounded-lg p-4 bg-muted/30 text-sm leading-relaxed"
          onScrollCapture={(e) => {
            const el = e.currentTarget.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement;
            if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
              setGelesen(true);
            }
          }}
        >
          <div className="whitespace-pre-wrap text-foreground">
            {aktuellesDok.inhalt || (
              <span className="text-muted-foreground italic">
                Kein Inhalt hinterlegt. Bitte wenden Sie sich an Ihre Teamleitung.
              </span>
            )}
          </div>
          {!gelesen && (
            <div className="sticky bottom-0 pt-2 text-center text-xs text-muted-foreground animate-pulse">
              ↓ Bitte scrollen Sie bis zum Ende
            </div>
          )}
        </ScrollArea>

        {/* Typ-Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {aktuellesDok.typ === "datenschutzerklaerung" && "Datenschutzerklärung"}
            {aktuellesDok.typ === "avv" && "Auftragsverarbeitungsvertrag"}
            {aktuellesDok.typ === "einwilligung" && "Einwilligung"}
            {aktuellesDok.typ === "loeschkonzept" && "Löschkonzept"}
            {aktuellesDok.typ === "verarbeitungsverzeichnis" && "Verarbeitungsverzeichnis"}
          </Badge>
          {gelesen && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Gelesen
            </span>
          )}
        </div>

        {/* Rechtlicher Hinweis */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Rechtlicher Hinweis:</strong> Mit dem Klick auf „Zustimmen und weiter" bestätigen Sie, dass Sie das
          obenstehende Dokument vollständig gelesen und verstanden haben. Ihre Zustimmung wird mit Zeitstempel und
          IP-Adresse protokolliert (DSGVO-konform).
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted-foreground">
            {offeneDokumente.length - aktuellerIndex - 1 > 0
              ? `Noch ${offeneDokumente.length - aktuellerIndex - 1} weitere Dokument(e) ausstehend`
              : "Letztes Dokument"}
          </span>
          <Button
            onClick={() => zustimmenMutation.mutate({ dokumentId: aktuellesDok.id })}
            disabled={zustimmenMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {zustimmenMutation.isPending ? (
              "Wird gespeichert..."
            ) : aktuellerIndex < offeneDokumente.length - 1 ? (
              <>Zustimmen und weiter →</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-1" /> Zustimmen und Portal öffnen</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
