import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);

    const [allocations, classAssignments] = await Promise.all([
      prisma.teacherAllocation.findMany({
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
      }),
      prisma.classTeacherAssignment.findMany({
        where: {
          schoolId: membership.schoolId,
          teacherId: teacher.id,
          active: true,
          academicYear: { active: true },
        },
        distinct: ["academicYearId", "classId", "sectionId"],
        select: {
          academicYearId: true,
          classId: true,
          sectionId: true,
          section: { select: { name: true } },
        },
      }),
    ]);

    if (allocations.length === 0 && classAssignments.length === 0) {
      return ApiResponse.success({ schedules: [] });
    }

    const schedules = await prisma.examSchedule.findMany({
      where: {
        schoolId: membership.schoolId,
        exam: { active: true },
        OR: [
          ...allocations.map((allocation) => ({
            classId: allocation.classId,
            subjectId: allocation.subjectId,
            exam: { academicYearId: allocation.academicYearId, active: true },
            OR: [{ sectionId: null }, { sectionId: allocation.sectionId }],
          })),
          ...classAssignments.map((assignment) => ({
            classId: assignment.classId,
            exam: { academicYearId: assignment.academicYearId, active: true },
            OR: [{ sectionId: null }, { sectionId: assignment.sectionId }],
          })),
        ],
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
        assessmentType: true,
        exam: { select: { name: true, status: true, academicYearId: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true, code: true } },
      },
    });

    return ApiResponse.success({
      schedules: schedules.flatMap((schedule) => {
        const subjectScopes = allocations.filter(
          (allocation) =>
            allocation.academicYearId === schedule.exam.academicYearId &&
            allocation.classId === schedule.classId &&
            allocation.subjectId === schedule.subjectId &&
            (schedule.sectionId === null || schedule.sectionId === allocation.sectionId),
        );
        const classScopes = classAssignments.filter(
          (assignment) =>
            assignment.academicYearId === schedule.exam.academicYearId &&
            assignment.classId === schedule.classId &&
            (schedule.sectionId === null || schedule.sectionId === assignment.sectionId),
        );
        const scopes = new Map(
          [...subjectScopes, ...classScopes].map((scope) => [scope.sectionId, scope]),
        );
        return Array.from(scopes.values()).map((scope) => ({
            id: schedule.id,
            sectionId: scope.sectionId,
            examName: schedule.exam.name,
            examStatus: schedule.exam.status,
            className: schedule.class.name,
            sectionName: schedule.section?.name ?? scope.section.name,
            subjectName: schedule.subject.name,
            subjectCode: schedule.subject.code,
            examDate: schedule.examDate,
            maxMarks: schedule.maxMarks,
            passMarks: schedule.passMarks,
            assessmentType: schedule.assessmentType,
            editable: !["COMPLETED", "CANCELLED"].includes(schedule.exam.status),
          }));
      }),
    });
  });
}
