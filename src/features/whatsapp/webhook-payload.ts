import { createHmac, timingSafeEqual } from "node:crypto";

export const META_STATUS_RANK = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
} as const;

export type MetaStatus = keyof typeof META_STATUS_RANK;

export type MetaStatusUpdate = {
  providerMessageId: string;
  status: MetaStatus;
  occurredAt: Date;
  errorMessage: string | null;
  wabaId: string;
  phoneNumberId: string | null;
};

export function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
) {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const received = Buffer.from(signature.slice(7), "hex");
  const expected = Buffer.from(
    createHmac("sha256", appSecret).update(rawBody).digest("hex"),
    "hex",
  );
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function parseMetaWhatsappStatuses(rawBody: string): MetaStatusUpdate[] {
  const payload = JSON.parse(rawBody) as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          metadata?: { phone_number_id?: string };
          statuses?: Array<{
            id?: string;
            status?: string;
            timestamp?: string;
            errors?: Array<{
              code?: number;
              title?: string;
              message?: string;
              error_data?: { details?: string };
            }>;
          }>;
        };
      }>;
    }>;
  };
  if (payload.object !== "whatsapp_business_account") return [];

  const updates: MetaStatusUpdate[] = [];
  for (const entry of payload.entry ?? []) {
    if (!entry.id) continue;
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const phoneNumberId = change.value?.metadata?.phone_number_id ?? null;
      for (const event of change.value?.statuses ?? []) {
        if (!event.id || !(event.status && event.status in META_STATUS_RANK)) continue;
        const status = event.status as MetaStatus;
        const timestamp = Number(event.timestamp);
        const occurredAt = event.timestamp && Number.isFinite(timestamp) && timestamp > 0
          ? new Date(timestamp * 1000)
          : new Date();
        const errorMessage = (event.errors ?? [])
          .flatMap((error) => [
            error.code ? `Meta ${error.code}` : null,
            error.title,
            error.message,
            error.error_data?.details,
          ])
          .filter((value): value is string => Boolean(value))
          .join(" — ") || null;
        updates.push({
          providerMessageId: event.id,
          status,
          occurredAt,
          errorMessage,
          wabaId: entry.id,
          phoneNumberId,
        });
      }
    }
  }
  return updates;
}
