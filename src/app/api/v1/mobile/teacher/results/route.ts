import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);

    const allocations = await prisma.teacherAllocation.findMany({
      where: {
        schoolId: membership.schoolId,
        teacherId: teacher.id,
        active: true,
        academicYear: { active: true },
      },
      distinct: ["academicYearId", "classId", "sectionId", "subjectId"],
      select: {
        academicYearId: true,
        classId: true,
        sectionId: true,
        subjectId: true,
        section: { select: { name: true } },
      },
    });

    if (allocations.length === 0) {
      return ApiResponse.success({ schedules: [] });
    }

    const schedules = await prisma.examSchedule.findMany({
      where: {
        schoolId: membership.schoolId,
        exam: { active: true },
        OR: allocations.map((allocation) => ({
          classId: allocation.classId,
          subjectId: allocation.subjectId,
          exam: { academicYearId: allocation.academicYearId, active: true },
          OR: [
            { sectionId: null },
            { sectionId: allocation.sectionId },
          ],
        })),
      },
      orderBy: [
        { examDate: "desc" },
        { exam: { name: "asc" } },
        { class: { displayOrder: "asc" } },
        { subject: { displayOrder: "asc" } },
      ],
      select: {
        id: true,
        classId: true,
        sectionId: true,
        subjectId: true,
        examDate: true,
        maxMarks: true,
        passMarks: true,
        exam: { select: { name: true, status: true, academicYearId: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true, code: true } },
      },
    });

    return ApiResponse.success({
      schedules: schedules.flatMap((schedule) => {
        return allocations
          .filter(
            (allocation) =>
              allocation.academicYearId === schedule.exam.academicYearId &&
              allocation.classId === schedule.classId &&
              allocation.subjectId === schedule.subjectId &&
              (schedule.sectionId === null || schedule.sectionId === allocation.sectionId),
          )
          .map((allocation) => ({
            id: schedule.id,
            sectionId: allocation.sectionId,
            examName: schedule.exam.name,
            examStatus: schedule.exam.status,
            className: schedule.class.name,
            sectionName: schedule.section?.name ?? allocation.section.name,
            subjectName: schedule.subject.name,
            subjectCode: schedule.subject.code,
            examDate: schedule.examDate,
            maxMarks: schedule.maxMarks,
            passMarks: schedule.passMarks,
            editable: !["COMPLETED", "CANCELLED"].includes(schedule.exam.status),
          }));
      }),
    });
  });
}
