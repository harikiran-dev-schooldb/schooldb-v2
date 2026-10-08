import { prisma } from "@/lib/prisma";

export async function getTeacherProfile(teacherId: string, schoolId: string) {
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: {
      allocations: {
        where: {
          active: true,
          ...(academicYear ? { academicYearId: academicYear.id } : {}),
        },
        orderBy: [
          { class: { name: "asc" } },
          { section: { name: "asc" } },
          { subject: { name: "asc" } },
        ],
        select: {
          id: true,
          remarks: true,
          academicYear: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          timetables: {
            where: { active: true },
            select: {
              id: true,
              day: true,
              period: {
                select: {
                  id: true,
                  name: true,
                  startTime: true,
                  endTime: true,
                  displayOrder: true,
                },
              },
            },
            orderBy: { period: { displayOrder: "asc" } },
          },
        },
      },
      classTeacherAssignments: {
        where: {
          active: true,
          ...(academicYear ? { academicYearId: academicYear.id } : {}),
        },
        orderBy: [{ class: { name: "asc" } }, { section: { name: "asc" } }],
        select: {
          id: true,
          remarks: true,
          academicYear: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
      },
      staffAttendances: {
        where: academicYear
          ? { date: { gte: academicYear.startDate, lte: academicYear.endDate } }
          : {},
        orderBy: { date: "desc" },
        take: 240,
      },
      staffLeaveRequests: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      salaryStructures: {
        orderBy: { effectiveFrom: "desc" },
        take: 12,
      },
      payrollEntries: {
        orderBy: { createdAt: "desc" },
        take: 36,
        include: {
          payrollRun: {
            select: { id: true, year: true, month: true, status: true },
          },
        },
      },
    },
  });

  if (!teacher) return null;

  const { clerkId, ...profile } = teacher;

  return JSON.parse(
    JSON.stringify({
      ...profile,
      loginProvisioned: Boolean(clerkId),
      academicYear,
    }),
  );
}
