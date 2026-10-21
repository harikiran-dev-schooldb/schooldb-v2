import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("push delivery uses a durable uniquely keyed job", () => {
  const schema = source("prisma/schema.prisma");
  const queue = source("src/features/notifications/push-queue.ts");

  assert.match(schema, /model PushDeliveryJob/);
  assert.match(schema, /announcementId\s+String\s+@unique/);
  assert.match(schema, /@@index\(\[status, nextAttemptAt, createdAt\]\)/);
  assert.match(schema, /@@index\(\[status, startedAt\]\)/);
  assert.match(queue, /attempts:\s*\{ lt: MAX_PUSH_ATTEMPTS \}/);
  assert.match(queue, /Recovered after an interrupted worker/);
});

test("the secured push worker is registered with the deployment scheduler", () => {
  const route = source("src/app/api/cron/push-delivery/route.ts");
  const vercel = JSON.parse(source("vercel.json")) as {
    crons: Array<{ path: string; schedule: string }>;
  };

  assert.match(route, /processPendingPushDeliveries/);
  assert.match(route, /CRON_SECRET/);
  assert.ok(vercel.crons.some((cron) => cron.path === "/api/cron/push-delivery"));
});

test("interrupted WhatsApp recipients are returned to the retry queue", () => {
  const service = source("src/features/whatsapp/service.ts");

  assert.match(service, /status:\s*"SENDING"/);
  assert.match(service, /Recovered after an interrupted delivery worker/);
  assert.match(service, /attempts:\s*\{ lt: 3 \}/);
});
