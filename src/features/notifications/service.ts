import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { requireMembership, teacherAllocationScope } from "@/lib/auth";
import { isSelfServiceRole } from "@/lib/access-control";
import { listAccessibleStudents } from "@/lib/student-access";
import { notificationVisibility } from "./visibility";

export async function notificationContext(schoolSlug: string) {
  const membership = await requireMembership(schoolSlug);

  if (!isSelfServiceRole(membership.role)) {
    const audience: Prisma.AnnouncementWhereInput[] = [{ targetType: "SCHOOL" }];

    if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
      audience.push({ targetType: "ADMIN" });
    }

    if (membership.role === "TEACHER") {
      const allocations = await teacherAllocationScope(membership.schoolId);
      const classIds = Array.from(
        new Set(allocations.map((allocation) => allocation.classId)),
      );
      const sectionIds = Array.from(
        new Set(allocations.map((allocation) => allocation.sectionId)),
      );
      if (classIds.length > 0) {
        audience.push({ targetType: "CLASS", targetId: { in: classIds } });
      }
      if (sectionIds.length > 0) {
        audience.push({ targetType: "SECTION", targetId: { in: sectionIds } });
      }
    }

    const now = new Date();
    return {
      membership,
      where: {
        schoolId: membership.schoolId,
        archived: false,
        publishedAt: { lte: now },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: audience },
        ],
      },
    };
  }

  const { students } = await listAccessibleStudents(schoolSlug);
  const visibility = notificationVisibility(membership.schoolId, students);
  return {
    membership,
    where: visibility,
  };
}

export async function unreadNotificationCount(schoolSlug: string) {
  const { membership, where } = await notificationContext(schoolSlug);
  return prisma.announcement.count({
    where: { ...where, reads: { none: { userId: membership.userId } } },
  });
}
