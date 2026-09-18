import { z } from "zod";

import { notificationVisibility } from "@/features/notifications/visibility";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";
import { validateBody } from "@/lib/validation";

async function familyNotificationContext() {
  const { membership, students } = await listAccessibleStudents();
  const visibility = notificationVisibility(membership.schoolId, students);
  return {
    membership,
    where: {
      ...visibility,
      ...(membership.role === "PARENT"
        ? { category: { not: "BIRTHDAY" } }
        : {}),
    },
  };
}

export async function GET() {
  return apiHandler(async () => {
    const { membership, where } = await familyNotificationContext();
    const rows = await prisma.announcement.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        priority: true,
        targetLabel: true,
        publishedAt: true,
        reads: { where: { userId: membership.userId }, select: { id: true } },
      },
    });
    const items = rows
      .map(({ reads, ...item }) => ({ ...item, read: reads.length > 0 }))
      .sort((a, b) => Number(a.read) - Number(b.read));

    return ApiResponse.success({
      unreadCount: items.filter((item) => !item.read).length,
      items,
    });
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const { membership, where } = await familyNotificationContext();
    const body = await validateBody(req, z.object({ id: z.string().min(1) }));
    const item = await prisma.announcement.findFirst({
      where: { ...where, id: body.id },
      select: { id: true },
    });
    if (!item) throw new ApiError(404, "Notification unavailable.");

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: item.id,
          userId: membership.userId,
        },
      },
      create: { announcementId: item.id, userId: membership.userId },
      update: {},
    });

    return ApiResponse.success({ id: item.id, read: true });
  });
}
