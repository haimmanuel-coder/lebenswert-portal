import webpush from "web-push";
import { ENV } from "./_core/env";

// VAPID-Keys aus Umgebungsvariablen (niemals hartcodiert)
const VAPID_PUBLIC_KEY = ENV.vapidPublicKey;
const VAPID_PRIVATE_KEY = ENV.vapidPrivateKey;

let webpushReady = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@lebenswert-betreuung.de",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    webpushReady = true;
    console.log("[WebPush] VAPID-Keys erfolgreich geladen");
  } catch (err) {
    console.error("[WebPush] Ungültige VAPID-Keys:", err);
  }
} else {
  console.warn("[WebPush] VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY fehlen – Push-Benachrichtigungen deaktiviert");
}

export const VAPID_PUBLIC = VAPID_PUBLIC_KEY;
export const IS_PUSH_READY = webpushReady;

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; icon?: string; badge?: string; url?: string }
): Promise<boolean> {
  if (!webpushReady) {
    console.warn("[WebPush] Push nicht verfügbar – VAPID-Keys fehlen");
    return false;
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-72.png",
        url: payload.url || "/",
      })
    );
    return true;
  } catch (err: any) {
    console.warn("[WebPush] Senden fehlgeschlagen:", err?.statusCode, err?.message);
    return false;
  }
}

export async function sendBudgetWarnungPush(
  subscriptions: PushSubscriptionData[],
  kundenName: string,
  paragraph: string,
  restBudget: number
): Promise<number> {
  if (!webpushReady) return 0;
  let sent = 0;
  for (const sub of subscriptions) {
    const ok = await sendPushNotification(sub, {
      title: "⚠️ Budget-Warnung – Lebenswert Betreuung",
      body: `${kundenName}: §${paragraph} SGB XI – Restbudget ${restBudget.toFixed(2)} € (< 10%)`,
      url: "/",
    });
    if (ok) sent++;
  }
  return sent;
}
