import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type StaffLeaveFilters = { classId?: string; sectionId?: string; from?: string; to?: string };

function filterDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function listStaffLeaveRequests(schoolSlug: string, filters: StaffLeaveFilters = {}) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"], schoolSlug);
  let allocationScope: Array<{ classId: string; sectionId: string }> | null = null;

  if (membership.role === "TEACHER") {
    const teacher = await requireCurrentTeacher(membership.schoolId);
    const allocations = await prisma.teacherAllocation.findMany({
      where: { schoolId: membership.schoolId, teacherId: teacher.id, active: true },
      select: { classId: true, sectionId: true },
      distinct: ["classId", "sectionId"],
    });
    allocationScope = allocations;
  }

  const from = filterDate(filters.from);
  const to = filterDate(filters.to);

  return prisma.leaveRequest.findMany({
    where: {
      schoolId: membership.schoolId,
      ...(from || to ? { startDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(filters.classId || filters.sectionId ? { enrollment: { ...(filters.classId ? { classId: filters.classId } : {}), ...(filters.sectionId ? { sectionId: filters.sectionId } : {}) } } : {}),
      ...(allocationScope
        ? {
            OR: allocationScope.map(({ classId, sectionId }) => ({
              enrollment: { classId, sectionId },
            })),
          }
        : {}),
    },
    include: {
      student: { select: { id: true, fullName: true, admissionNo: true } },
      enrollment: {
        select: {
          rollNo: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
}


export async function leaveRequestFilterOptions(schoolSlug: string) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"], schoolSlug);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolId: membership.schoolId, active: true },
    select: { classId: true, sectionId: true },
    distinct: ["classId", "sectionId"],
  });
  const classIds = [...new Set(enrollments.map((item) => item.classId))];
  const sectionIds = [...new Set(enrollments.map((item) => item.sectionId))];
  const [classes, sections] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: membership.schoolId, id: { in: classIds } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.section.findMany({ where: { schoolId: membership.schoolId, id: { in: sectionIds } }, select: { id: true, name: true, classId: true }, orderBy: { name: "asc" } }),
  ]);
  return { classes, sections };
}
