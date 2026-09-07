import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  parseMetaWhatsappStatuses,
  verifyMetaWebhookSignature,
} from "../src/features/whatsapp/webhook-payload.ts";

test("verifies Meta webhook signatures against the unmodified request body", () => {
  const body = JSON.stringify({ object: "whatsapp_business_account" });
  const secret = "test-app-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  assert.equal(verifyMetaWebhookSignature(body, signature, secret), true);
  assert.equal(verifyMetaWebhookSignature(`${body} `, signature, secret), false);
  assert.equal(verifyMetaWebhookSignature(body, "sha256=bad", secret), false);
  assert.equal(verifyMetaWebhookSignature(body, null, secret), false);
});

test("extracts delivery status timestamps and Meta failure details", () => {
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      id: "waba-1",
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "phone-1" },
          statuses: [
            { id: "wamid.read", status: "read", timestamp: "1725700000" },
            {
              id: "wamid.failed",
              status: "failed",
              timestamp: "1725700001",
              errors: [{ code: 131026, title: "Message undeliverable" }],
            },
            { id: "wamid.ignored", status: "deleted", timestamp: "1725700002" },
          ],
        },
      }],
    }],
  });

  const updates = parseMetaWhatsappStatuses(body);
  assert.equal(updates.length, 2);
  assert.deepEqual(
    updates.map(({ providerMessageId, status, errorMessage, wabaId, phoneNumberId }) => ({
      providerMessageId,
      status,
      errorMessage,
      wabaId,
      phoneNumberId,
    })),
    [
      {
        providerMessageId: "wamid.read",
        status: "read",
        errorMessage: null,
        wabaId: "waba-1",
        phoneNumberId: "phone-1",
      },
      {
        providerMessageId: "wamid.failed",
        status: "failed",
        errorMessage: "Meta 131026 — Message undeliverable",
        wabaId: "waba-1",
        phoneNumberId: "phone-1",
      },
    ],
  );
  assert.equal(updates[0]?.occurredAt.toISOString(), "2024-09-07T09:06:40.000Z");
});
