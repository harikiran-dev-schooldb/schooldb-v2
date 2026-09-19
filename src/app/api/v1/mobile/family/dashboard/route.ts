import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";

export async function GET() {
  return apiHandler(async () => {
    const { membership, students } = await listAccessibleStudents();
    const studentIds = students.map((student) => student.id);
    const enrollmentTargets = students.flatMap((student) =>
      student.enrollments.map((enrollment) => ({
        classId: enrollment.classId,
        AND: [
          { OR: [{ academicYearId: enrollment.academicYearId }, { academicYearId: null }] },
          { OR: [{ sectionId: null }, { sectionId: enrollment.sectionId }] },
        ],
      })),
    );

    const [attendance, homework, installments, marks] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          schoolId: membership.schoolId,
          studentId: { in: studentIds },
          session: { academicYear: { active: true } },
        },
        select: { studentId: true, status: true },
      }),
      enrollmentTargets.length > 0 ? prisma.homework.findMany({
        where: {
          schoolId: membership.schoolId,
          active: true,
          OR: enrollmentTargets,
        },
        orderBy: [{ dueDate: "asc" }, { assignedDate: "desc" }],
        select: {
          id: true,
          academicYearId: true,
          classId: true,
          sectionId: true,
          title: true,
          dueDate: true,
          subject: { select: { name: true } },
        },
      }) : Promise.resolve([]),
      prisma.studentFeeInstallment.findMany({
        where: {
          studentFeeItem: {
            studentFee: {
              schoolId: membership.schoolId,
              active: true,
              studentEnrollment: { studentId: { in: studentIds }, active: true },
            },
          },
        },
        select: {
          payableAmount: true,
          paidAmount: true,
          studentFeeItem: {
            select: {
              studentFee: {
                select: { studentEnrollment: { select: { studentId: true } } },
              },
            },
          },
        },
      }),
      prisma.studentExamMark.findMany({
        where: {
          schoolId: membership.schoolId,
          studentEnrollment: { studentId: { in: studentIds } },
          examSchedule: { exam: { status: "COMPLETED" } },
        },
        select: {
          studentEnrollment: { select: { studentId: true } },
          examSchedule: { select: { examId: true } },
        },
      }),
    ]);

    return ApiResponse.success({
      role: membership.role,
      userName:
        [membership.user.firstName, membership.user.lastName]
          .filter(Boolean)
          .join(" ") || membership.user.email,
      schoolName: membership.school.name,
      students: students.map((student) => {
        const enrollment = student.enrollments[0] ?? null;
        const records = attendance.filter((item) => item.studentId === student.id);
        const attended = records.filter((item) =>
          ["PRESENT", "LATE"].includes(item.status),
        ).length;
        const studentHomework = enrollment
          ? homework.filter(
              (item) =>
                (item.academicYearId === enrollment.academicYearId || item.academicYearId === null) &&
                item.classId === enrollment.classId &&
                (item.sectionId === null || item.sectionId === enrollment.sectionId),
            )
          : [];
        const outstanding = installments
          .filter(
            (item) =>
              item.studentFeeItem.studentFee.studentEnrollment.studentId ===
              student.id,
          )
          .reduce(
            (total, item) =>
              total + Number(item.payableAmount) - Number(item.paidAmount),
            0,
          );
        const resultCount = new Set(
          marks
            .filter((item) => item.studentEnrollment.studentId === student.id)
            .map((item) => item.examSchedule.examId),
        ).size;

        return {
          id: student.id,
          fullName: student.fullName || "Student",
          admissionNo: student.admissionNo,
          relationship: student.relationship,
          imageUrl: student.imageUrl,
          enrollment: enrollment
            ? {
                className: enrollment.class.name,
                sectionName: enrollment.section.name,
                academicYearName: enrollment.academicYear.name,
                rollNo: enrollment.rollNo,
              }
            : null,
          attendance: {
            attended,
            total: records.length,
            percentage:
              records.length > 0
                ? Math.round((attended / records.length) * 1000) / 10
                : null,
          },
          pendingHomeworkCount: studentHomework.length,
          recentHomework: studentHomework.slice(0, 3).map((item) => ({
            id: item.id,
            title: item.title,
            subjectName: item.subject?.name ?? "General",
            dueDate: item.dueDate,
          })),
          outstandingFee: Math.max(0, outstanding),
          completedResultCount: resultCount,
        };
      }),
    });
  });
}
