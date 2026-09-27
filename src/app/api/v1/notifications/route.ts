import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { notificationContext } from "@/features/notifications/service";
import { validateBody } from "@/lib/validation";

const updateSchema = z.object({
  schoolSlug: z.string().trim().min(1).max(120),
  announcementId: z.string().trim().min(1).max(120),
  read: z.boolean(),
});

export async function GET(request: Request) {
  return apiHandler(async () => {
    const url = new URL(request.url);
    const schoolSlug = url.searchParams.get("schoolSlug")?.trim();
    if (!schoolSlug) {
      return ApiResponse.error("School is required.", 400);
    }

    const { membership, where } = await notificationContext(schoolSlug);
    const [items, unreadCount] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 8,
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
          priority: true,
          targetLabel: true,
          publishedAt: true,
          reads: {
            where: { userId: membership.userId },
            select: { id: true },
          },
        },
      }),
      prisma.announcement.count({
        where: { ...where, reads: { none: { userId: membership.userId } } },
      }),
    ]);

    return ApiResponse.success({
      unreadCount,
      items: items.map(({ reads, ...item }) => ({
        ...item,
        read: reads.length > 0,
      })),
    });
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, updateSchema);
    const { membership, where } = await notificationContext(input.schoolSlug);
    const announcement = await prisma.announcement.findFirst({
      where: { ...where, id: input.announcementId },
      select: { id: true },
    });
    if (!announcement) {
      return ApiResponse.error("Notification unavailable.", 404);
    }

    if (input.read) {
      await prisma.announcementRead.upsert({
        where: {
          announcementId_userId: {
            announcementId: input.announcementId,
            userId: membership.userId,
          },
        },
        create: {
          announcementId: input.announcementId,
          userId: membership.userId,
        },
        update: {},
      });
    } else {
      await prisma.announcementRead.deleteMany({
        where: {
          announcementId: input.announcementId,
          userId: membership.userId,
        },
      });
    }

    return ApiResponse.success({ read: input.read });
  });
}
