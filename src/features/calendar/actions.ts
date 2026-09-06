"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveAudience } from "@/features/audiences/resolve";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const calendarEventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000),
  category: z.enum(["HOLIDAY", "EXAM", "EVENT", "FEE_DEADLINE", "PARENT_MEETING"]),
  startDate: z.string(),
  endDate: z.string(),
  targetType: z.enum(["SCHOOL", "CLASS", "SECTION", "STUDENT"]),
  targetId: z.string().trim().max(100),
});

export async function createCalendarEvent(schoolSlug: string, _: { error: string; success: boolean }, form: FormData) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const parsed = calendarEventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Complete the event title, dates, and audience.", success: false };
  const input = parsed.data;
  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return { error: "The end date must be the same as or later than the start date.", success: false };
  }
  let audience: Awaited<ReturnType<typeof resolveAudience>>;
  try {
    audience = await resolveAudience(membership.schoolId, input.targetType, input.targetId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Choose a valid audience.", success: false };
  }
  await prisma.schoolCalendarEvent.create({
    data: {
      schoolId: membership.schoolId,
      createdBy: membership.userId,
      title: input.title,
      description: input.description || null,
      category: input.category,
      startDate,
      endDate,
      targetType: input.targetType,
      targetId: audience.targetId,
      targetLabel: audience.targetLabel,
    },
  });
  revalidatePath(`/${schoolSlug}`, "layout");
  return { error: "", success: true };
}

export async function setCalendarEventArchived(schoolSlug: string, id: string, archived: boolean) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  await prisma.schoolCalendarEvent.updateMany({ where: { id, schoolId: membership.schoolId }, data: { archived } });
  revalidatePath(`/${schoolSlug}`, "layout");
}
