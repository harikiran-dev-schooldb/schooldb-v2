import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

async function notificationContext() {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const now = new Date();
  return {
    membership,
    where: {
      schoolId: membership.schoolId,
      archived: false,
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  };
}

export async function GET() {
  return apiHandler(async () => {
    const { membership, where } = await notificationContext();
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
    const items = rows.map(({ reads, ...item }) => ({ ...item, read: reads.length > 0 }));
    return ApiResponse.success({
      unreadCount: items.filter((item) => !item.read).length,
      items,
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { membership, where } = await notificationContext();
    const body = await validateBody(request, z.object({ id: z.string().min(1) }));
    const announcement = await prisma.announcement.findFirst({
      where: { ...where, id: body.id },
      select: { id: true },
    });
    if (!announcement) throw new ApiError(404, "Announcement unavailable.");
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: announcement.id,
          userId: membership.userId,
        },
      },
      create: { announcementId: announcement.id, userId: membership.userId },
      update: {},
    });
    return ApiResponse.success({ id: announcement.id, read: true });
  });
}
