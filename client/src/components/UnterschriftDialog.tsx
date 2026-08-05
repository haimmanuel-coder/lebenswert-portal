/**
 * ════════════════════════════════════════════════════════════════════════════
 *  UNTERSCHRIFT-DIALOG
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Digitales Unterschriftsfeld mit Canvas-Pad.
 * Gibt die Unterschrift als Base64-PNG zurück.
 *
 * Gesetzliche Grundlage: §12 ArbSchG – digitale Bestätigung ist zulässig,
 * wenn Identität des Unterzeichners nachvollziehbar ist.
 */

import { useRef, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (unterschriftBase64: string) => void;
  titel: string;
  inhalt?: string;
  isPending?: boolean;
}

export default function UnterschriftDialog({ open, onClose, onConfirm, titel, inhalt, isPending }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showInhalt, setShowInhalt] = useState(false);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
    setIsEmpty(true);
  }, []);

  const handleEnd = useCallback(() => {
    setIsEmpty(sigRef.current?.isEmpty() ?? true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const dataUrl = sigRef.current.toDataURL("image/png");
    onConfirm(dataUrl);
  }, [onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">✍️ Unterweisung bestätigen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Titel */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-semibold text-green-900 text-sm">{titel}</p>
            <p className="text-xs text-green-700 mt-1">
              Durch Ihre Unterschrift bestätigen Sie, dass Sie den Inhalt dieser Unterweisung
              gelesen, verstanden und zur Kenntnis genommen haben (§12 ArbSchG).
            </p>
          </div>

          {/* Inhalt anzeigen/ausblenden */}
          {inhalt && (
            <div>
              <button
                type="button"
                onClick={() => setShowInhalt(!showInhalt)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {showInhalt ? "▲ Inhalt ausblenden" : "▼ Unterweisungsinhalt lesen"}
              </button>
              {showInhalt && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {inhalt
                      .replace(/^#{1,3}\s+/gm, "")
                      .replace(/\*\*(.*?)\*\*/g, "$1")
                      .replace(/\*(.*?)\*/g, "$1")
                    }
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Unterschriftsfeld */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Bitte hier unterschreiben:</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden"
              style={{ touchAction: "none" }}>
              <SignatureCanvas
                ref={sigRef}
                penColor="#1e3a2f"
                canvasProps={{
                  width: 580,
                  height: 160,
                  className: "w-full",
                  style: { touchAction: "none", cursor: "crosshair" },
                }}
                onEnd={handleEnd}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {isEmpty ? "Noch keine Unterschrift vorhanden" : "✅ Unterschrift erfasst"}
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-500 hover:underline"
              >
                🗑️ Löschen
              </button>
            </div>
          </div>

          {/* Rechtlicher Hinweis */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>⚖️ Rechtlicher Hinweis:</strong> Diese digitale Unterschrift ist
              rechtsverbindlich. Datum, Uhrzeit und technische Metadaten werden automatisch
              im Nachweis-PDF gespeichert. Das Dokument wird sicher in der Cloud aufbewahrt.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isEmpty || isPending}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            {isPending ? "Wird gespeichert..." : "✍️ Bestätigen & Unterschreiben"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
