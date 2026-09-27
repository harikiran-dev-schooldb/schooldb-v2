"use server";

import { revalidatePath } from "next/cache";

import type { AudienceType } from "@/features/audiences/types";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  getWhatsappEligibleRecipientCount,
  processWhatsappCampaignBatch,
} from "./service";
import { isManualWhatsappAnnouncementAllowed } from "./policy";

export type WhatsappActionState = {
  error: string;
  success: string;
};

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
  _form: FormData,
): Promise<WhatsappActionState> {
  void _state;
  void _form;
  await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  if (isManualWhatsappAnnouncementAllowed()) {
    throw new Error("Manual WhatsApp announcements require an explicit policy change.");
  }
  return {
    error: "Manual WhatsApp announcements are disabled. Use in-app announcements instead.",
    success: "",
  };
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

  const campaign = await prisma.whatsappCampaign.findFirst({
    where: { id: campaignId, schoolId: membership.schoolId, automatic: true },
    select: { id: true },
  });
  if (!campaign) throw new Error("Only automatic operational alerts can be sent through WhatsApp.");

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
      automatic: true,
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
