import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Verbindet sich mit dem SSE-Endpunkt /api/sse und zeigt Echtzeit-Benachrichtigungen.
 * Reconnect-Logik mit exponential backoff.
 */
export function useSSENotifications(mitarbeiterId?: number) {
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mitarbeiterId) return;

    const connect = () => {
      try {
        const es = new EventSource(`/api/sse?mitarbeiterId=${mitarbeiterId}`);
        esRef.current = es;

        es.addEventListener("notification", (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data);
            toast(data.titel ?? "Neue Benachrichtigung", {
              description: data.inhalt,
              duration: 5000,
            });
          } catch { /* ignore parse errors */ }
        });

        es.addEventListener("einsatz_update", (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data);
            toast(`📅 Einsatz aktualisiert`, {
              description: data.message ?? "Ein Einsatz wurde geändert.",
              duration: 4000,
            });
          } catch { /* ignore */ }
        });

        es.onopen = () => { retryRef.current = 0; };

        es.onerror = () => {
          es.close();
          esRef.current = null;
          const delay = Math.min(2000 * Math.pow(2, retryRef.current), 30000);
          retryRef.current++;
          timerRef.current = setTimeout(connect, delay);
        };
      } catch { /* SSE nicht verfügbar */ }
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mitarbeiterId]);
}
