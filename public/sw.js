const HOSTNAME = self.location.hostname.toLowerCase();
const LOCAL_PREVIEW_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];
const ALLOWED_HOST = HOSTNAME === "schooldb.co.in"
  || HOSTNAME.endsWith(".schooldb.co.in")
  || LOCAL_PREVIEW_HOSTS.includes(HOSTNAME);
self.addEventListener("install", (event) => {
  if (!ALLOWED_HOST) {
    event.waitUntil(self.registration.unregister());
    return;
  }
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
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("schooldb-pwa-")).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
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
  const priority = String(data.priority || "NORMAL").toUpperCase();
  const options = {
    body: notification.body || data.body || "You have a new school update.",
    icon: notification.icon || "/pwa-192.png",
    badge: notification.badge || "/pwa-192.png",
    tag: notification.tag || data.announcementId || "schooldb-update",
    timestamp: Date.now(),
    renotify: priority === "URGENT",
    requireInteraction: priority === "URGENT",
    vibrate: priority === "URGENT" ? [180, 80, 180] : [120],
    actions: [{ action: "open", title: "Open SchoolDB" }],
    data: {
      url: notification.navigate || data.link || payload.fcmOptions?.link || "/",
      announcementId: data.announcementId,
      category: data.category,
      priority,
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
