import { isSelfServiceRole } from "@/lib/access-control";
import { apiHandler } from "@/lib/api";
import { requireMembership, teacherClassScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";
import { notificationContext } from "@/features/notifications/service";
import { hasModuleAccess } from "@/lib/staff-permissions";

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
      const teacherScope = membership.role === "TEACHER"
        ? await teacherClassScope(membership.schoolId)
        : null;
      const canReadStudents = hasModuleAccess(membership, "STUDENTS");
      const canReadAttendance = hasModuleAccess(membership, "ATTENDANCE");
      const canReadLearning = hasModuleAccess(membership, "LEARNING");
      const canReadFrontOffice = hasModuleAccess(membership, "FRONT_OFFICE");
      const scopeFilter = teacherScope
        ? { OR: teacherScope.map((scope) => ({ classId: scope.classId, sectionId: scope.sectionId })) }
        : {};
      const indiaDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const today = new Date(`${indiaDate}T00:00:00.000Z`);

      const [students, homework, attendanceSessions, visitors, pickupAuthorizations] = await Promise.all([
        canReadStudents || canReadAttendance || canReadLearning || canReadFrontOffice
          ? prisma.student.findMany({
              where: {
                schoolId: membership.schoolId,
                status: "ACTIVE",
                enrollments: {
                  some: {
                    active: true,
                    ...scopeFilter,
                  },
                },
              },
              orderBy: [{ fullName: "asc" }, { admissionNo: "asc" }],
              take: 600,
              select: {
                id: true,
                admissionNo: true,
                fullName: true,
                enrollments: {
                  where: { active: true, ...scopeFilter },
                  take: 1,
                  select: {
                    id: true,
                    rollNo: true,
                    class: { select: { id: true, name: true } },
                    section: { select: { id: true, name: true } },
                  },
                },
              },
            })
          : [],
        canReadLearning
          ? prisma.homework.findMany({
              where: {
                schoolId: membership.schoolId,
                active: true,
                ...(teacherScope
                  ? {
                      OR: teacherScope.map((scope) => ({
                        classId: scope.classId,
                        OR: [{ sectionId: scope.sectionId }, { sectionId: null }],
                      })),
                    }
                  : {}),
              },
              orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
              take: 60,
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
          : [],
        canReadAttendance
          ? prisma.attendanceSession.findMany({
              where: {
                schoolId: membership.schoolId,
                attendanceDate: today,
                ...(teacherScope ? scopeFilter : {}),
              },
              orderBy: [{ class: { displayOrder: "asc" } }, { section: { name: "asc" } }],
              take: 40,
              select: {
                id: true,
                attendanceDate: true,
                sessionType: true,
                locked: true,
                class: { select: { name: true } },
                section: { select: { name: true } },
                records: {
                  where: { student: { status: "ACTIVE" } },
                  orderBy: { student: { fullName: "asc" } },
                  select: {
                    id: true,
                    studentId: true,
                    status: true,
                    remarks: true,
                    student: { select: { admissionNo: true, fullName: true } },
                  },
                },
              },
            })
          : [],
        canReadFrontOffice
          ? prisma.visitorLog.findMany({
              where: { schoolId: membership.schoolId },
              orderBy: { checkInAt: "desc" },
              take: 80,
            })
          : [],
        canReadFrontOffice
          ? prisma.pickupAuthorization.findMany({
              where: { schoolId: membership.schoolId, student: { status: "ACTIVE" } },
              orderBy: { createdAt: "desc" },
              take: 100,
              include: { student: { select: { admissionNo: true, fullName: true } } },
            })
          : [],
      ]);

      return ApiResponse.success({
        generatedAt: new Date().toISOString(),
        school: { slug: schoolSlug, name: membership.school.name },
        role: membership.role,
        capabilities: [
          ...(canReadAttendance ? ["ATTENDANCE"] : []),
          ...(canReadLearning ? ["HOMEWORK", "MARKS"] : []),
          ...(canReadFrontOffice ? ["VISITORS", "PICKUP"] : []),
        ],
        students,
        homework,
        timetable: [],
        attendance: attendanceSessions,
        notifications,
        visitors,
        pickupAuthorizations,
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
      capabilities: ["LEAVE_REQUEST"],
      students,
      homework,
      timetable,
      attendance,
      notifications,
    });
  });
}
