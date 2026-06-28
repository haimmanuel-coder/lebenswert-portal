import webpush from "web-push";

// VAPID-Keys (generiert für Lebenswert Betreuung)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BJ1QN3XM_zQi3_CFlurX4QE_qYMKfwNXhUHgUphp3EM_SnuSF5LINkeZyHv-iEX5_mf1qWbm7orrB9w4cHXYd80";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "rLLaOCihvWZlg5LUCNTfoqQiM7anP2_HQ5ew56m6UPY";

webpush.setVapidDetails(
  "mailto:admin@lebenswert-betreuung.de",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export const VAPID_PUBLIC = VAPID_PUBLIC_KEY;

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; icon?: string; badge?: string; url?: string }
): Promise<boolean> {
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
    console.warn("[WebPush] Failed to send:", err?.statusCode, err?.message);
    return false;
  }
}

export async function sendBudgetWarnungPush(
  subscriptions: PushSubscriptionData[],
  kundenName: string,
  paragraph: string,
  restBudget: number
): Promise<number> {
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
