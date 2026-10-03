import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWebPushPayload,
  isExpiredWebPushError,
  parseStoredWebPushSubscription,
} from "../src/lib/web-push.ts";

test("builds a declarative payload with a service-worker fallback", () => {
  const payload = JSON.parse(buildWebPushPayload({
    title: "School closed",
    body: "Classes are closed tomorrow.",
    link: "https://schooldb.co.in/demo/notifications/open",
    tag: "announcement-1",
    appBadge: 3,
    data: { announcementId: "announcement-1" },
  }));

  assert.equal(payload.web_push, 8030);
  assert.equal(payload.notification.navigate, "https://schooldb.co.in/demo/notifications/open");
  assert.equal(payload.notification.app_badge, "3");
  assert.equal(payload.data.link, "https://schooldb.co.in/demo/notifications/open");
  assert.equal(payload.data.announcementId, "announcement-1");
});

test("accepts valid stored subscriptions and rejects malformed JSON", () => {
  const subscription = {
    endpoint: "https://push.example.test/device",
    keys: { p256dh: "public-key", auth: "authentication-secret" },
  };

  assert.deepEqual(parseStoredWebPushSubscription(subscription), subscription);
  assert.equal(parseStoredWebPushSubscription({ endpoint: subscription.endpoint }), null);
});

test("recognizes expired web push endpoints", () => {
  assert.equal(isExpiredWebPushError({ statusCode: 404 }), true);
  assert.equal(isExpiredWebPushError({ statusCode: 410 }), true);
  assert.equal(isExpiredWebPushError({ statusCode: 429 }), false);
});
