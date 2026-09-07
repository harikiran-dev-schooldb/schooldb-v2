"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createWhatsappCampaign, processWhatsappCampaignBatch } from "./service";

export type WhatsappActionState = { error: string; success: string };

const campaignSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(900),
  targetType: z.enum(["SCHOOL", "CLASS", "SECTION", "STUDENT"]),
  targetId: z.string().trim().max(100),
  scheduledAt: z.string(),
});

export async function queueWhatsappCampaign(schoolSlug: string, _state: WhatsappActionState, form: FormData): Promise<WhatsappActionState> {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const parsed = campaignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Complete the message and choose a valid audience.", success: "" };
  const templateName = process.env.META_WA_ANNOUNCEMENT_TEMPLATE || "school_announcement";
  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : new Date();
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Choose a valid sending time.", success: "" };
  try {
    const campaign = await createWhatsappCampaign({
      schoolId: membership.schoolId,
      createdBy: membership.userId,
      ...parsed.data,
      scheduledAt,
      templateName,
    });
    revalidatePath(`/${schoolSlug}/whatsapp`);
    return { error: "", success: `Campaign queued for ${campaign.recipientCount} mobile number${campaign.recipientCount === 1 ? "" : "s"}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to queue this campaign.", success: "" };
  }
}

export async function processWhatsappCampaign(schoolSlug: string, campaignId: string) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  await processWhatsappCampaignBatch(membership.schoolId, campaignId);
  revalidatePath(`/${schoolSlug}/whatsapp`);
}
