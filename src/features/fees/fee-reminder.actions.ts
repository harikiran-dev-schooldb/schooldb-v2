"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import {
  previewManualFeeReminders,
  sendManualFeeReminders,
  type FeeReminderFilters,
} from "./services/fee-reminder.service";

const filtersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  classId: z.string().trim().max(100).optional(),
  sectionId: z.string().trim().max(100).optional(),
  academicYearId: z.string().trim().max(100).optional(),
});

function parseFilters(filters: FeeReminderFilters) {
  const parsed = filtersSchema.safeParse(filters);
  if (!parsed.success) throw new Error("The selected fee filters are invalid.");
  return parsed.data;
}

export async function previewFeeRemindersAction(
  schoolSlug: string,
  filters: FeeReminderFilters,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    schoolSlug,
  );
  return previewManualFeeReminders(
    membership.schoolId,
    parseFilters(filters),
  );
}

export async function sendFeeRemindersAction(
  schoolSlug: string,
  filters: FeeReminderFilters,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    schoolSlug,
  );
  const result = await sendManualFeeReminders({
    schoolId: membership.schoolId,
    createdBy: membership.userId,
    filters: parseFilters(filters),
  });

  await recordAuditLog({
    actor: membership,
    module: "FEES",
    action: "SEND",
    entityType: "FEE_DUE_WHATSAPP_CAMPAIGN",
    entityId: result.campaignId,
    summary: `Manually triggered overdue-fee reminders for ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}.`,
    metadata: {
      recipientCount: result.recipientCount,
      processed: result.processed,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      remaining: result.remaining,
    },
  });
  revalidatePath(`/${schoolSlug}/fees/outstanding`);
  revalidatePath(`/${schoolSlug}/whatsapp`);
  return result;
}
