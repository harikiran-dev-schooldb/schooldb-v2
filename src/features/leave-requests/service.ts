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
    where: { schoolId: membership.schoolId, status: "ACTIVE" },
    select: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true, classId: true } },
    },
    distinct: ["classId", "sectionId"],
  });
  const classes = Array.from(new Map(enrollments.map((item) => [item.class.id, item.class])).values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const sections = Array.from(new Map(enrollments.map((item) => [item.section.id, item.section])).values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { classes, sections };
}
