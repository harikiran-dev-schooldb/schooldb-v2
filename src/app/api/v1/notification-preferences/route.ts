import { z } from "zod";

import { defaultNotificationPreferences } from "@/features/notifications/preferences";
import { apiHandler } from "@/lib/api";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const preferencesSchema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
  announcements: z.boolean(),
  homework: z.boolean(),
  attendance: z.boolean(),
  fees: z.boolean(),
  exams: z.boolean(),
  leaveUpdates: z.boolean(),
  urgent: z.boolean(),
});

const select = {
  announcements: true,
  homework: true,
  attendance: true,
  fees: true,
  exams: true,
  leaveUpdates: true,
  urgent: true,
} as const;

export async function GET(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug")?.trim();
    if (!schoolSlug) return ApiResponse.error("School is required.", 400);
    const membership = await requireMembership(schoolSlug);
    const preferences = await prisma.notificationPreference.findUnique({
      where: { schoolId_userId: { schoolId: membership.schoolId, userId: membership.userId } },
      select,
    });
    return ApiResponse.success(preferences ?? defaultNotificationPreferences);
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, preferencesSchema);
    const membership = await requireMembership(input.schoolSlug);
    const data = {
      announcements: input.announcements,
      homework: input.homework,
      attendance: input.attendance,
      fees: input.fees,
      exams: input.exams,
      leaveUpdates: input.leaveUpdates,
      urgent: input.urgent,
    };
    const preferences = await prisma.notificationPreference.upsert({
      where: { schoolId_userId: { schoolId: membership.schoolId, userId: membership.userId } },
      create: { schoolId: membership.schoolId, userId: membership.userId, ...data },
      update: data,
      select,
    });
    return ApiResponse.success(preferences, "Notification preferences updated.");
  });
}
