import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: vapidData } = trpc.push.vapidKey.useQuery(undefined, {
    staleTime: Infinity,
  });

  const subscribeMut = trpc.push.subscribe.useMutation({
    onSuccess: () => {
      setIsSubscribed(true);
      toast.success("Push-Benachrichtigungen aktiviert! 🔔");
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const unsubscribeMut = trpc.push.unsubscribe.useMutation({
    onSuccess: () => {
      setIsSubscribed(false);
      toast.success("Push-Benachrichtigungen deaktiviert");
    },
  });

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      // Prüfen ob bereits subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      }).catch(() => {});
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidData?.publicKey) return;
    setIsLoading(true);
    try {
      // Einheitlichen Service Worker verwenden (bereits in index.html registriert)
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const reg = await navigator.serviceWorker.ready;

      // Berechtigung anfragen
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Benachrichtigungen wurden nicht erlaubt.");
        return;
      }

      // Subscription erstellen
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const subJson = sub.toJSON();
      const keys = subJson.keys as { p256dh: string; auth: string };

      await subscribeMut.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    } catch (err: any) {
      toast.error("Fehler beim Aktivieren: " + (err?.message || "Unbekannter Fehler"));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidData, subscribeMut]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMut.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } catch (err: any) {
      toast.error("Fehler beim Deaktivieren: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMut]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
