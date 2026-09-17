"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AudienceType } from "@/features/audiences/types";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  createWhatsappCampaign,
  getWhatsappEligibleRecipientCount,
  processWhatsappCampaignBatch,
} from "./service";

export type WhatsappActionState = {
  error: string;
  success: string;
};

const campaignSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(900),
  targetType: z.enum(["SCHOOL", "CLASS", "SECTION", "STUDENT"]),
  targetId: z.string().trim().max(100),
  scheduledAt: z.string(),
});

/**
 * Returns the number of opted-in and eligible WhatsApp recipients
 * for the currently selected audience.
 *
 * This is called by WhatsappCampaignForm before the campaign is queued.
 */
export async function getWhatsappRecipientPreview(
  schoolSlug: string,
  targetType: AudienceType,
  targetId: string,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );

  return getWhatsappEligibleRecipientCount(
    membership.schoolId,
    targetType,
    targetId,
  );
}

/**
 * Creates and queues a new manual WhatsApp campaign.
 */
export async function queueWhatsappCampaign(
  schoolSlug: string,
  _state: WhatsappActionState,
  form: FormData,
): Promise<WhatsappActionState> {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );

  const parsed = campaignSchema.safeParse(Object.fromEntries(form));

  if (!parsed.success) {
    return {
      error: "Complete the message and choose a valid audience.",
      success: "",
    };
  }

  const {
    title,
    message,
    targetType,
    targetId,
    scheduledAt: scheduledAtValue,
  } = parsed.data;

  const templateName =
    process.env.META_WA_ANNOUNCEMENT_TEMPLATE || "school_announcement";

  const scheduledAt = scheduledAtValue
    ? new Date(scheduledAtValue)
    : new Date();

  if (Number.isNaN(scheduledAt.getTime())) {
    return {
      error: "Choose a valid sending time.",
      success: "",
    };
  }

  try {
    const campaign = await createWhatsappCampaign({
      schoolId: membership.schoolId,
      createdBy: membership.userId,
      title,
      message,
      targetType,
      targetId,
      scheduledAt,
      templateName,
    });

    await recordAuditLog({
      actor: membership,
      module: "COMMUNICATION",
      action: "CREATE",
      entityType: "WHATSAPP_CAMPAIGN",
      entityId: campaign.id,
      summary: `Queued WhatsApp campaign “${title}” for ${campaign.recipientCount} recipient${
        campaign.recipientCount === 1 ? "" : "s"
      }.`,
      metadata: {
        recipientCount: campaign.recipientCount,
        targetType,
        targetId,
      },
    });

    revalidatePath(`/${schoolSlug}/whatsapp`);

    return {
      error: "",
      success: `Campaign queued for ${campaign.recipientCount} eligible WhatsApp recipient${
        campaign.recipientCount === 1 ? "" : "s"
      }.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to queue this campaign.",
      success: "",
    };
  }
}

/**
 * Processes the next queued batch for a campaign.
 */
export async function processWhatsappCampaign(
  schoolSlug: string,
  campaignId: string,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );

  await processWhatsappCampaignBatch(membership.schoolId, campaignId);

  await recordAuditLog({
    actor: membership,
    module: "COMMUNICATION",
    action: "SEND",
    entityType: "WHATSAPP_CAMPAIGN",
    entityId: campaignId,
    summary: "Processed the next WhatsApp campaign batch.",
  });

  revalidatePath(`/${schoolSlug}/whatsapp`);
}

/**
 * Resets failed recipients and retries the campaign.
 */
export async function retryFailedWhatsappCampaign(
  schoolSlug: string,
  campaignId: string,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );

  const campaign = await prisma.whatsappCampaign.findFirst({
    where: {
      id: campaignId,
      schoolId: membership.schoolId,
      failedCount: {
        gt: 0,
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!campaign) {
    throw new Error("No failed messages were found for this campaign.");
  }

  const reset = await prisma.$transaction(async (tx) => {
    const recipients = await tx.whatsappRecipient.updateMany({
      where: {
        campaignId,
        schoolId: membership.schoolId,
        status: "FAILED",
      },
      data: {
        status: "QUEUED",
        attempts: 0,
        errorMessage: null,
        failedAt: null,
      },
    });

    await tx.whatsappCampaign.update({
      where: {
        id: campaignId,
      },
      data: {
        status: "QUEUED",
        failedCount: 0,
        completedAt: null,
      },
    });

    return recipients.count;
  });

  if (reset === 0) {
    throw new Error("No failed messages were available to retry.");
  }

  await processWhatsappCampaignBatch(membership.schoolId, campaignId);

  await recordAuditLog({
    actor: membership,
    module: "COMMUNICATION",
    action: "SEND",
    entityType: "WHATSAPP_CAMPAIGN",
    entityId: campaignId,
    summary: `Retried ${reset} failed WhatsApp message${
      reset === 1 ? "" : "s"
    } from “${campaign.title}”.`,
    metadata: {
      retriedRecipients: reset,
    },
  });

  revalidatePath(`/${schoolSlug}/whatsapp`);
}
