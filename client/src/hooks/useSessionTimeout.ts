/**
 * useSessionTimeout.ts
 * Aufgabe 17 – DSGVO/IT-Sicherheit: Automatischer Sitzungs-Timeout
 *
 * Nach 30 Minuten Inaktivität (kein Mausklick, keine Tastatureingabe, kein Touch)
 * wird der Nutzer automatisch abgemeldet und auf die Login-Seite weitergeleitet.
 * 2 Minuten vor dem Timeout erscheint eine Warnung.
 */
import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const TIMEOUT_MS = 30 * 60 * 1000;   // 30 Minuten
const WARN_BEFORE_MS = 2 * 60 * 1000; // 2 Minuten Vorwarnung

export function useSessionTimeout(onLogout: () => void, aktiv: boolean = true) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnToastId = useRef<string | number | null>(null);

  const reset = useCallback(() => {
    if (!aktiv) return;

    // Bestehende Timer löschen
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    // Vorhandene Warn-Toast schließen
    if (warnToastId.current !== null) {
      toast.dismiss(warnToastId.current);
      warnToastId.current = null;
    }

    // Vorwarnung 2 Minuten vor Timeout
    warnRef.current = setTimeout(() => {
      warnToastId.current = toast.warning(
        "⚠️ Sitzung läuft ab – in 2 Minuten werden Sie automatisch abgemeldet.",
        { duration: WARN_BEFORE_MS, id: "session-warn" }
      );
    }, TIMEOUT_MS - WARN_BEFORE_MS);

    // Automatische Abmeldung nach 30 Minuten
    timeoutRef.current = setTimeout(() => {
      toast.error("🔒 Sitzung abgelaufen – Sie wurden aus Sicherheitsgründen abgemeldet.");
      onLogout();
    }, TIMEOUT_MS);
  }, [aktiv, onLogout]);

  useEffect(() => {
    if (!aktiv) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // Initial starten

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
    };
  }, [aktiv, reset]);
}
