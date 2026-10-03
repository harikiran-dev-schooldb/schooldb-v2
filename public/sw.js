const CACHE_NAME = "schooldb-pwa-v4";
const OFFLINE_URL = "/offline";
const HOSTNAME = self.location.hostname.toLowerCase();
const ALLOWED_HOST = HOSTNAME === "schooldb.co.in" || HOSTNAME.endsWith(".schooldb.co.in");
const APP_ASSETS = [
  OFFLINE_URL,
  "/pwa-192.png",
  "/pwa-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  if (!ALLOWED_HOST) {
    event.waitUntil(self.registration.unregister());
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (!ALLOWED_HOST) {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith("schooldb-pwa-")).map((key) => caches.delete(key))))
        .then(() => self.registration.unregister()),
    );
    return;
  }
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("schooldb-pwa-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (!ALLOWED_HOST) return;
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Next.js fingerprints production assets and controls their caching headers.
  // Caching dev chunks here can keep old environment variables in the browser.
  const isStaticAsset = APP_ASSETS.includes(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!ALLOWED_HOST) return;
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "SchoolDB", body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "SchoolDB";
  const options = {
    body: notification.body || data.body || "You have a new school update.",
    icon: notification.icon || "/pwa-192.png",
    badge: notification.badge || "/pwa-192.png",
    tag: notification.tag || data.announcementId || "schooldb-update",
    data: {
      url: notification.navigate || data.link || payload.fcmOptions?.link || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((client) => client.postMessage({ type: "SCHOOLDB_PUSH_RECEIVED" }));

      if (typeof self.navigator?.setAppBadge === "function") {
        const notifications = await self.registration.getNotifications();
        await self.navigator.setAppBadge(notifications.length);
      }
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  if (!ALLOWED_HOST) return;
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      if (typeof self.navigator?.setAppBadge === "function") {
        const notifications = await self.registration.getNotifications();
        if (notifications.length) await self.navigator.setAppBadge(notifications.length);
        else if (typeof self.navigator.clearAppBadge === "function") await self.navigator.clearAppBadge();
      }
      const existing = clients.find((client) => client.url === targetUrl);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
