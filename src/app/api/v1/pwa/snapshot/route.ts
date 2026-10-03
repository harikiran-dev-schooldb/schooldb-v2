import { isSelfServiceRole } from "@/lib/access-control";
import { apiHandler } from "@/lib/api";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";
import { notificationContext } from "@/features/notifications/service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug")?.trim();
    if (!schoolSlug) return ApiResponse.error("School is required.", 400);
    const membership = await requireMembership(schoolSlug);
    const { where } = await notificationContext(schoolSlug);
    const notifications = await prisma.announcement.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 20,
      select: { id: true, title: true, body: true, category: true, priority: true, publishedAt: true },
    });

    if (!isSelfServiceRole(membership.role)) {
      return ApiResponse.success({
        generatedAt: new Date().toISOString(),
        school: { slug: schoolSlug, name: membership.school.name },
        role: membership.role,
        students: [],
        homework: [],
        timetable: [],
        attendance: [],
        notifications,
      });
    }

    const context = await listAccessibleStudents(schoolSlug);
    const students = context.students.map((student) => ({
      id: student.id,
      admissionNo: student.admissionNo,
      fullName: student.fullName,
      relationship: student.relationship,
      enrollment: student.enrollments[0]
        ? {
            academicYearId: student.enrollments[0].academicYearId,
            classId: student.enrollments[0].classId,
            className: student.enrollments[0].class.name,
            sectionId: student.enrollments[0].sectionId,
            sectionName: student.enrollments[0].section.name,
            rollNo: student.enrollments[0].rollNo,
          }
        : null,
    }));
    const activeEnrollments = context.students.flatMap((student) => student.enrollments.slice(0, 1));
    const studentIds = context.students.map((student) => student.id);
    const scopes = activeEnrollments.map((enrollment) => ({
      academicYearId: enrollment.academicYearId,
      classId: enrollment.classId,
      OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }],
    }));

    const [homework, timetable, attendance] = await Promise.all([
      scopes.length
        ? prisma.homework.findMany({
            where: { schoolId: membership.schoolId, active: true, OR: scopes },
            orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
            take: 40,
            select: {
              id: true,
              title: true,
              description: true,
              assignedDate: true,
              dueDate: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
              subject: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      activeEnrollments.length
        ? prisma.timetable.findMany({
            where: {
              schoolId: membership.schoolId,
              active: true,
              OR: activeEnrollments.map((enrollment) => ({
                academicYearId: enrollment.academicYearId,
                teacherAllocation: {
                  classId: enrollment.classId,
                  sectionId: enrollment.sectionId,
                  active: true,
                },
              })),
            },
            orderBy: [{ day: "asc" }, { period: { displayOrder: "asc" } }],
            select: {
              id: true,
              day: true,
              period: { select: { name: true, startTime: true, endTime: true } },
              teacherAllocation: {
                select: {
                  class: { select: { name: true } },
                  section: { select: { name: true } },
                  subject: { select: { name: true } },
                  teacher: { select: { fullName: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      studentIds.length
        ? prisma.attendance.findMany({
            where: { schoolId: membership.schoolId, studentId: { in: studentIds } },
            orderBy: { session: { attendanceDate: "desc" } },
            take: 60,
            select: {
              id: true,
              studentId: true,
              status: true,
              remarks: true,
              session: { select: { attendanceDate: true, sessionType: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    return ApiResponse.success({
      generatedAt: new Date().toISOString(),
      school: { slug: schoolSlug, name: membership.school.name },
      role: membership.role,
      students,
      homework,
      timetable,
      attendance,
      notifications,
    });
  });
}
