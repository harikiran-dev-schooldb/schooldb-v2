import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listStaffLeaveRequests(schoolSlug: string) {
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

  return prisma.leaveRequest.findMany({
    where: {
      schoolId: membership.schoolId,
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
