"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationContext } from "./service";
import { resolveAudience } from "@/features/audiences/resolve";
import { recordAuditLog } from "@/lib/audit";

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(10000),
  category: z.enum([
    "GENERAL",
    "FEES",
    "EXAM",
    "HOMEWORK",
    "ATTENDANCE",
    "EMERGENCY",
  ]),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  targetType: z.enum(["SCHOOL", "CLASS", "SECTION", "STUDENT"]),
  targetId: z.string().trim().max(100),
  publishedAt: z.string(),
  expiresAt: z.string(),
});

export async function publishAnnouncement(
  schoolSlug: string,
  _: { error: string; success: boolean },
  form: FormData,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Please complete the title, message, and audience fields.",
      success: false,
    };
  const input = parsed.data;
  const publishedAt = input.publishedAt
    ? new Date(input.publishedAt)
    : new Date();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (
    isNaN(publishedAt.getTime()) ||
    (expiresAt && (isNaN(expiresAt.getTime()) || expiresAt <= publishedAt))
  ) {
    return {
      error: "Expiry must be later than the publication time.",
      success: false,
    };
  }
  let audience: Awaited<ReturnType<typeof resolveAudience>>;
  try {
    audience = await resolveAudience(
      membership.schoolId,
      input.targetType,
      input.targetId,
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Choose a valid audience.",
      success: false,
    };
  }
  const announcement = await prisma.announcement.create({
    data: {
      schoolId: membership.schoolId,
      createdBy: membership.userId,
      title: input.title,
      body: input.body,
      category: input.category,
      priority: input.priority,
      targetType: input.targetType,
      targetId: audience.targetId,
      targetLabel: audience.targetLabel,
      publishedAt,
      expiresAt,
    },
  });
  await recordAuditLog({
    actor: membership,
    module: "COMMUNICATION",
    action: "PUBLISH",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    summary: `Published announcement “${announcement.title}” to ${announcement.targetLabel}.`,
  });
  revalidatePath(`/${schoolSlug}`, "layout");
  return { error: "", success: true };
}

export async function setAnnouncementArchived(
  schoolSlug: string,
  id: string,
  archived: boolean,
) {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const result = await prisma.announcement.updateMany({
    where: { id, schoolId: membership.schoolId },
    data: { archived },
  });
  if (result.count > 0) {
    await recordAuditLog({
      actor: membership,
      module: "COMMUNICATION",
      action: archived ? "ARCHIVE" : "PUBLISH",
      entityType: "ANNOUNCEMENT",
      entityId: id,
      summary: `${archived ? "Archived" : "Republished"} an announcement.`,
    });
  }
  revalidatePath(`/${schoolSlug}`, "layout");
}

export async function markAnnouncement(
  schoolSlug: string,
  id: string,
  read: boolean,
) {
  const { membership, where } = await notificationContext(schoolSlug);
  const announcement = await prisma.announcement.findFirst({
    where: { ...where, id },
    select: { id: true },
  });
  if (!announcement) throw new Error("Notification unavailable.");
  if (read) {
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: membership.userId,
        },
      },
      create: { announcementId: id, userId: membership.userId },
      update: {},
    });
  } else {
    await prisma.announcementRead.deleteMany({
      where: { announcementId: id, userId: membership.userId },
    });
  }
  revalidatePath(`/${schoolSlug}/my`, "layout");
}
