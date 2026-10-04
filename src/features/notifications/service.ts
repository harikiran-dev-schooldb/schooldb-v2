import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { requireMembership, teacherClassScope } from "@/lib/auth";
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
      const ownTeacher = await prisma.teacher.findFirst({
        where: {
          schoolId: membership.schoolId,
          active: true,
          clerkId: membership.user.clerkUserId,
        },
        select: { id: true },
      });
      if (ownTeacher) audience.push({ targetType: "TEACHER", targetId: ownTeacher.id });
      const allocations = await teacherClassScope(membership.schoolId);
      const classIds = Array.from(
        new Set(allocations.map((allocation) => allocation.classId)),
      );
      const sectionIds = Array.from(
        new Set(allocations.map((allocation) => allocation.sectionId)),
      );
      const classScopes = classIds.length
        ? await prisma.class.findMany({
            where: { schoolId: membership.schoolId, id: { in: classIds } },
            select: {
              branchId: true,
              branch: { select: { syllabusId: true } },
            },
          })
        : [];
      const branchIds = Array.from(new Set(classScopes.map((item) => item.branchId)));
      const syllabusIds = Array.from(
        new Set(classScopes.map((item) => item.branch.syllabusId)),
      );
      if (syllabusIds.length > 0) {
        audience.push({ targetType: "SYLLABUS", targetId: { in: syllabusIds } });
      }
      if (branchIds.length > 0) {
        audience.push({ targetType: "BRANCH", targetId: { in: branchIds } });
      }
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
