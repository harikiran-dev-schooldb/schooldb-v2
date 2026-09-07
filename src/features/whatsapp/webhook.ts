import { prisma } from "@/lib/prisma";
import {
  META_STATUS_RANK,
  parseMetaWhatsappStatuses,
  type MetaStatus,
  type MetaStatusUpdate,
} from "./webhook-payload";

export { verifyMetaWebhookSignature } from "./webhook-payload";

function recipientStatus(status: MetaStatus) {
  return status === "sent"
    ? "SENT" as const
    : status === "delivered"
      ? "DELIVERED" as const
      : status === "read"
        ? "READ" as const
        : "FAILED" as const;
}

function lowerRecipientStatuses(status: MetaStatus) {
  if (status === "sent") return ["QUEUED", "SENDING"] as const;
  if (status === "delivered") return ["QUEUED", "SENDING", "SENT"] as const;
  if (status === "read") return ["QUEUED", "SENDING", "SENT", "DELIVERED"] as const;
  return ["QUEUED", "SENDING", "SENT", "DELIVERED", "READ"] as const;
}

function newestUpdates(updates: MetaStatusUpdate[]) {
  const deduplicated = new Map<string, MetaStatusUpdate>();
  for (const update of updates) {
    const current = deduplicated.get(update.providerMessageId);
    if (
      !current ||
      update.occurredAt > current.occurredAt ||
      (update.occurredAt.getTime() === current.occurredAt.getTime() &&
        META_STATUS_RANK[update.status] > META_STATUS_RANK[current.status])
    ) {
      deduplicated.set(update.providerMessageId, update);
    }
  }
  return [...deduplicated.values()];
}

async function refreshCampaignTotals(campaignIds: string[]) {
  if (campaignIds.length === 0) return;
  const [campaigns, grouped] = await Promise.all([
    prisma.whatsappCampaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, recipientCount: true, status: true, completedAt: true },
    }),
    prisma.whatsappRecipient.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, Map<string, number>>();
  for (const row of grouped) {
    const campaignCounts = counts.get(row.campaignId) ?? new Map<string, number>();
    campaignCounts.set(row.status, row._count._all);
    counts.set(row.campaignId, campaignCounts);
  }
  const now = new Date();
  await prisma.$transaction(campaigns.map((campaign) => {
    const campaignCounts = counts.get(campaign.id) ?? new Map<string, number>();
    const sentOnly = campaignCounts.get("SENT") ?? 0;
    const deliveredOnly = campaignCounts.get("DELIVERED") ?? 0;
    const readCount = campaignCounts.get("READ") ?? 0;
    const failedCount = campaignCounts.get("FAILED") ?? 0;
    const sentCount = sentOnly + deliveredOnly + readCount;
    const deliveredCount = deliveredOnly + readCount;
    const finished = sentCount + failedCount >= campaign.recipientCount;
    const status = campaign.status === "CANCELLED"
      ? "CANCELLED" as const
      : finished
        ? failedCount === 0
          ? "COMPLETED" as const
          : sentCount === 0
            ? "FAILED" as const
            : "PARTIAL" as const
        : sentCount > 0 || failedCount > 0
          ? "SENDING" as const
          : "QUEUED" as const;
    return prisma.whatsappCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount,
        deliveredCount,
        readCount,
        failedCount,
        status,
        completedAt: finished ? campaign.completedAt ?? now : null,
      },
    });
  }));
}

export async function processMetaWhatsappWebhook(rawBody: string) {
  const expectedWabaId = process.env.META_WABA_ID;
  const expectedPhoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const parsed = newestUpdates(parseMetaWhatsappStatuses(rawBody)).filter(
    (update) =>
      (!expectedWabaId || update.wabaId === expectedWabaId) &&
      (!expectedPhoneNumberId || update.phoneNumberId === expectedPhoneNumberId),
  );
  if (parsed.length === 0) return { received: 0, updated: 0 };

  const recipients = await prisma.whatsappRecipient.findMany({
    where: { providerMessageId: { in: parsed.map((item) => item.providerMessageId) } },
    select: { id: true, campaignId: true, providerMessageId: true },
  });
  const byProviderId = new Map(
    recipients.map((recipient) => [recipient.providerMessageId, recipient]),
  );
  const matched = parsed.flatMap((event) => {
    const recipient = byProviderId.get(event.providerMessageId);
    if (!recipient) return [];
    const status = recipientStatus(event.status);
    return [{
      campaignId: recipient.campaignId,
      operation: prisma.whatsappRecipient.updateMany({
        where: {
          id: recipient.id,
          OR: [
            { providerStatusAt: null },
            { providerStatusAt: { lt: event.occurredAt } },
            {
              providerStatusAt: event.occurredAt,
              status: { in: [...lowerRecipientStatuses(event.status)] },
            },
          ],
        },
        data: {
          status,
          providerStatusAt: event.occurredAt,
          ...(status === "SENT" ? { sentAt: event.occurredAt } : {}),
          ...(status === "DELIVERED" ? { deliveredAt: event.occurredAt } : {}),
          ...(status === "READ" ? { readAt: event.occurredAt } : {}),
          ...(status === "FAILED"
            ? { failedAt: event.occurredAt, errorMessage: event.errorMessage || "WhatsApp delivery failed." }
            : { errorMessage: null }),
        },
      }),
    }];
  });
  const results = await prisma.$transaction(matched.map((item) => item.operation));
  const campaignIds = new Set(
    matched
      .filter((_, index) => results[index]?.count)
      .map((item) => item.campaignId),
  );
  const updated = results.reduce((total, result) => total + result.count, 0);

  await refreshCampaignTotals([...campaignIds]);
  return { received: parsed.length, updated };
}
