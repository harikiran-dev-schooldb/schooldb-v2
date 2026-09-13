import { z } from "zod";

import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

async function noticeContext() {
  const membership = await requireRole(["TEACHER"]);
  const teacher = await requireCurrentTeacher(membership.schoolId);
  const allocations = await prisma.teacherAllocation.findMany({
    where: {
      schoolId: membership.schoolId,
      teacherId: teacher.id,
      active: true,
      academicYear: { active: true },
    },
    distinct: ["classId", "sectionId"],
    select: { classId: true, sectionId: true },
  });
  const now = new Date();
  return {
    membership,
    where: {
      schoolId: membership.schoolId,
      archived: false,
      publishedAt: { lte: now },
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        {
          OR: [
            { targetType: "SCHOOL", targetId: null },
            { targetType: "CLASS", targetId: { in: allocations.map((item) => item.classId) } },
            { targetType: "SECTION", targetId: { in: allocations.map((item) => item.sectionId) } },
          ],
        },
      ],
    },
  };
}

export async function GET() {
  return apiHandler(async () => {
    const { membership, where } = await noticeContext();
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
    const { membership, where } = await noticeContext();
    const body = await validateBody(req, z.object({ id: z.string().min(1) }));
    const item = await prisma.announcement.findFirst({
      where: { ...where, id: body.id },
      select: { id: true },
    });
    if (!item) throw new Error("Notice unavailable.");
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
