// Service Worker – Lebenswert Betreuung (Offline + Push kombiniert)
const CACHE_NAME = "lebenswert-v2";
const OFFLINE_PAGE = "/offline.html";

const APP_SHELL = ["/", "/offline.html", "/manifest.json"];

// ── INSTALL ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-Requests: Network-First, bei Fehler 503
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: "offline", message: "Keine Internetverbindung" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Statische Assets: Cache-First
  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => new Response("", { status: 404 }));
      })
    );
    return;
  }

  // Navigation: Network-First, Offline-Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match(OFFLINE_PAGE) ||
              new Response("<h1>Offline</h1>", { headers: { "Content-Type": "text/html" } })
          )
        )
    );
    return;
  }
});

// ── PUSH-BENACHRICHTIGUNGEN ───────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Lebenswert Betreuung", body: event.data.text() }; }
  const title = data.title || "Lebenswert Betreuung";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    tag: "lebenswert-push",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-einsaetze") {
    event.waitUntil(syncOfflineEinsaetze());
  }
});

async function syncOfflineEinsaetze() {
  try {
    const db = await openOfflineDB();
    const items = await getAllOfflineItems(db);
    let synced = 0;
    for (const item of items) {
      try {
        // tRPC-kompatibler POST-Request
        const response = await fetch("/api/trpc/einsaetze.createOffline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: item.data }),
        });
        if (response.ok) {
          await deleteOfflineItem(db, item.id);
          synced++;
        }
      } catch {}
    }
    const allClients = await self.clients.matchAll();
    allClients.forEach((c) => c.postMessage({ type: "SYNC_COMPLETE", count: synced }));
  } catch {}
}

// ── INDEXEDDB ─────────────────────────────────────────
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("lebenswert-offline", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("einsaetze")) {
        db.createObjectStore("einsaetze", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}
function getAllOfflineItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("einsaetze", "readonly");
    const req = tx.objectStore("einsaetze").getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}
function deleteOfflineItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("einsaetze", "readwrite");
    const req = tx.objectStore("einsaetze").delete(id);
    req.onsuccess = resolve;
    req.onerror = reject;
  });
}
