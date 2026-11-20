import webPush, { type PushSubscription } from "web-push";

export type StoredWebPushSubscription = PushSubscription & {
  expirationTime?: number | null;
};

export type SchoolWebPushPayload = {
  title: string;
  body: string;
  link: string;
  icon?: string;
  badge?: string;
  tag?: string;
  appBadge?: number;
  data?: Record<string, string>;
};

function webPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function standardWebPushConfigured() {
  return webPushConfig() !== null;
}

export function parseStoredWebPushSubscription(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredWebPushSubscription>;
  if (
    typeof candidate.endpoint !== "string"
    || !candidate.keys
    || typeof candidate.keys.p256dh !== "string"
    || typeof candidate.keys.auth !== "string"
  ) {
    return null;
  }
  return candidate as StoredWebPushSubscription;
}

export function buildWebPushPayload(payload: SchoolWebPushPayload) {
  return JSON.stringify({
    // Keep delivery data-only so the service worker can reject stale messages
    // after sign-out before anything becomes visible to the user.
    data: {
      ...payload.data,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      icon: payload.icon ?? "/pwa-192.png",
      badge: payload.badge ?? "/pwa-192.png",
      tag: payload.tag,
      appBadge: payload.appBadge === undefined ? undefined : String(payload.appBadge),
    },
  });
}

export async function sendStandardWebPush(
  subscription: StoredWebPushSubscription,
  payload: SchoolWebPushPayload,
) {
  const config = webPushConfig();
  if (!config) throw new Error("Standards-based Web Push is not configured.");

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return webPush.sendNotification(
    subscription,
    buildWebPushPayload(payload),
    {
      TTL: 24 * 60 * 60,
      urgency: payload.data?.priority === "URGENT" ? "high" : "normal",
      topic: payload.tag?.slice(0, 32),
    },
  );
}

export function isExpiredWebPushError(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  if (error.statusCode === 404 || error.statusCode === 410) return true;

  // Apple returns 400 when the subscription was created with a different
  // VAPID public key. That subscription cannot succeed again and must be
  // replaced by the browser using the currently configured key.
  if (error.statusCode === 400 && "body" in error && typeof error.body === "string") {
    return error.body.includes("VapidPkHashMismatch");
  }
  return false;
}
