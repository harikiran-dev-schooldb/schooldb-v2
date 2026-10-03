import { isSchoolDbProductionHost } from "./production-domain";

const standardWebPushVapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_KEY;

export type BrowserPushState =
  | "enabled"
  | "denied"
  | "unsupported"
  | "requires-install"
  | "available";

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function browserDeviceKey(schoolSlug: string) {
  return `schooldb:web-push:v1:${schoolSlug}`;
}

export function isApplePlatform() {
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function browserPushState(schoolSlug: string): BrowserPushState {
  if (
    !("Notification" in window)
    || !("serviceWorker" in navigator)
    || !("PushManager" in window)
  ) return "unsupported";
  if (isAppleMobile() && !isStandalonePwa()) return "requires-install";
  if (Notification.permission === "denied") return "denied";
  if (
    Notification.permission === "granted"
    && Boolean(localStorage.getItem(browserDeviceKey(schoolSlug)))
  ) return "enabled";
  return "available";
}

async function registrationBody(registration: ServiceWorkerRegistration) {
  if (isApplePlatform()) {
    if (!standardWebPushVapidKey) {
      throw new Error("iPhone and Safari push needs the Web Push VAPID key to be configured.");
    }
    const subscription = (await registration.pushManager.getSubscription())
      ?? await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(standardWebPushVapidKey),
        }),
        20_000,
        "Safari did not create a push subscription. Check notification settings and try again.",
      );
    return { webPushSubscription: subscription.toJSON() };
  }

  const [{ getToken }, firebaseClient] = await Promise.all([
    import("firebase/messaging"),
    import("./firebase-client"),
  ]);
  if (!firebaseClient.firebaseWebPushConfigured || !firebaseClient.firebaseVapidKey) {
    throw new Error("Browser push needs the Firebase web keys to be configured.");
  }
  const messaging = await withTimeout(
    firebaseClient.webMessaging(),
    10_000,
    "Firebase messaging did not start. Check browser storage access and reload.",
  );
  if (!messaging) throw new Error("Push messaging is unavailable.");
  const fcmToken = await withTimeout(
    getToken(messaging, {
      vapidKey: firebaseClient.firebaseVapidKey,
      serviceWorkerRegistration: registration,
    }),
    20_000,
    "Firebase did not return a browser token. Confirm that the VAPID key belongs to this Firebase project.",
  );
  if (!fcmToken) throw new Error("The browser did not return a push token.");
  return { fcmToken };
}

async function saveRegistration(schoolSlug: string, requestPermission: boolean) {
  if (!isSchoolDbProductionHost(window.location.hostname)) {
    throw new Error("Browser notifications are available only on schooldb.co.in.");
  }
  const currentState = browserPushState(schoolSlug);
  if (currentState === "unsupported") throw new Error("This browser does not support push notifications.");
  if (currentState === "requires-install") {
    throw new Error("On iPhone or iPad, add SchoolDB to the Home Screen and open the installed app first.");
  }
  if (currentState === "denied") {
    throw new Error("Notifications are blocked in device settings. Allow notifications for SchoolDB and try again.");
  }

  if (requestPermission && Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");
  }
  if (Notification.permission !== "granted") return false;

  const existingRegistration = await navigator.serviceWorker.getRegistration("/");
  if (!existingRegistration) await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const registration = await withTimeout(
    navigator.serviceWorker.ready,
    10_000,
    "The notification service worker did not become ready. Reload the page and try again.",
  );
  const body = await registrationBody(registration);
  const key = browserDeviceKey(schoolSlug);
  const installationId = localStorage.getItem(key) ?? `web:${crypto.randomUUID()}`;
  const response = await fetch("/api/v1/web-push/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolSlug, installationId, ...body }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to enable browser alerts.");
  }
  localStorage.setItem(key, installationId);
  return true;
}

export function enableBrowserPush(schoolSlug: string) {
  return saveRegistration(schoolSlug, true);
}

export async function refreshBrowserPush(schoolSlug: string) {
  if (
    !("Notification" in window)
    || Notification.permission !== "granted"
    || !localStorage.getItem(browserDeviceKey(schoolSlug))
  ) return false;
  try {
    return await saveRegistration(schoolSlug, false);
  } catch (error) {
    console.warn("Unable to refresh browser push registration.", error);
    return false;
  }
}
