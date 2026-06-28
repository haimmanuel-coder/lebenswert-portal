import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// IndexedDB-Hilfsfunktionen
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("lebenswert-offline", 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("einsaetze")) {
        db.createObjectStore("einsaetze", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflineEinsatz {
  id?: number;
  kundenId: number;
  datum: string;
  startzeit?: string;
  endzeit?: string;
  paragraph: "45b" | "45a" | "39";
  bericht?: string;
  savedAt: string;
}

export async function saveOfflineEinsatz(data: Omit<OfflineEinsatz, "id" | "savedAt">): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("einsaetze", "readwrite");
    const store = tx.objectStore("einsaetze");
    store.add({ ...data, savedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineEinsaetze(): Promise<OfflineEinsatz[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("einsaetze", "readonly");
    const req = tx.objectStore("einsaetze").getAll();
    req.onsuccess = () => resolve(req.result as OfflineEinsatz[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearOfflineEinsatz(id: number): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("einsaetze", "readwrite");
    tx.objectStore("einsaetze").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Online/Offline-Status überwachen
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("🌐 Wieder online! Daten werden synchronisiert...");
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("📡 Offline-Modus aktiv – Einsätze werden lokal gespeichert");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Service Worker Nachrichten empfangen
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_COMPLETE") {
          setOfflineCount(0);
          toast.success(`✅ ${event.data.count} Einsätze synchronisiert`);
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Offline-Queue-Anzahl laden
  useEffect(() => {
    if ("indexedDB" in window) {
      getOfflineEinsaetze()
        .then((items) => setOfflineCount(items.length))
        .catch(() => {});
    }
  }, []);

  // Service Worker registrieren
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as any).sync.register("sync-offline-einsaetze");
      } catch {
        // Background Sync nicht unterstützt – manuell synchronisieren
        manualSync();
      }
    } else {
      manualSync();
    }
  }, []);

  const manualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const items = await getOfflineEinsaetze();
      if (items.length === 0) return;

      let synced = 0;
      for (const item of items) {
        try {
          // Versuche den Einsatz zu senden
          const response = await fetch("/api/trpc/einsaetze.create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ json: item }),
          });
          if (response.ok && item.id) {
            await clearOfflineEinsatz(item.id);
            synced++;
          }
        } catch {}
      }

      if (synced > 0) {
        setOfflineCount((c) => c - synced);
        toast.success(`✅ ${synced} Offline-Einsatz/Einsätze synchronisiert`);
      }
    } catch {
      toast.error("Synchronisation fehlgeschlagen");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { isOnline, offlineCount, isSyncing, triggerSync, saveOfflineEinsatz };
}
