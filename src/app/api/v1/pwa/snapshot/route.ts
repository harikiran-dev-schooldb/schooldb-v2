import { isSelfServiceRole } from "@/lib/access-control";
import { apiHandler } from "@/lib/api";
import { requireMembership, teacherClassScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { listAccessibleStudents } from "@/lib/student-access";
import { notificationContext } from "@/features/notifications/service";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { WeekDay } from "@/generated/prisma/client";

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
      const weekDay = [
        null,
        WeekDay.MONDAY,
        WeekDay.TUESDAY,
        WeekDay.WEDNESDAY,
        WeekDay.THURSDAY,
        WeekDay.FRIDAY,
        WeekDay.SATURDAY,
      ][today.getUTCDay()];
      const academicYear = canReadAttendance
        ? await prisma.academicYear.findFirst({
            where: { schoolId: membership.schoolId, active: true },
            orderBy: { startDate: "desc" },
            select: { id: true, attendanceMode: true },
          })
        : null;

      const [students, homework, attendanceSessions, attendanceEnrollments, attendanceEnrollmentCounts, attendanceTimetable, visitors, pickupAuthorizations] = await Promise.all([
        canReadStudents || canReadAttendance || canReadLearning || canReadFrontOffice
          ? prisma.student.findMany({
              where: {
                schoolId: membership.schoolId,
                status: "ACTIVE",
                enrollments: {
                  some: {
                    active: true,
                    ...(academicYear ? { academicYearId: academicYear.id } : {}),
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
                  where: {
                    active: true,
                    ...(academicYear ? { academicYearId: academicYear.id } : {}),
                    ...scopeFilter,
                  },
                  take: 1,
                  select: {
                    id: true,
                    academicYearId: true,
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
                academicYearId: true,
                classId: true,
                sectionId: true,
                periodId: true,
                attendanceDate: true,
                sessionType: true,
                locked: true,
                updatedAt: true,
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
        canReadAttendance && academicYear
          ? prisma.studentEnrollment.findMany({
              where: {
                schoolId: membership.schoolId,
                academicYearId: academicYear.id,
                active: true,
                student: { status: "ACTIVE" },
                ...(teacherScope ? scopeFilter : {}),
              },
              orderBy: [
                { class: { displayOrder: "asc" } },
                { section: { displayOrder: "asc" } },
                { rollNo: "asc" },
                { student: { fullName: "asc" } },
              ],
              take: 3000,
              select: {
                academicYearId: true,
                classId: true,
                sectionId: true,
                rollNo: true,
                class: { select: { name: true } },
                section: { select: { name: true } },
                student: {
                  select: { id: true, admissionNo: true, fullName: true },
                },
              },
            })
          : [],
        canReadAttendance && academicYear
          ? prisma.studentEnrollment.groupBy({
              by: ["classId", "sectionId"],
              where: {
                schoolId: membership.schoolId,
                academicYearId: academicYear.id,
                active: true,
                student: { status: "ACTIVE" },
                ...(teacherScope ? scopeFilter : {}),
              },
              _count: { studentId: true },
            })
          : [],
        canReadAttendance && academicYear?.attendanceMode === "EVERY_PERIOD" && weekDay
          ? prisma.timetable.findMany({
              where: {
                schoolId: membership.schoolId,
                academicYearId: academicYear.id,
                day: weekDay,
                active: true,
                teacherAllocation: {
                  active: true,
                  ...(teacherScope
                    ? {
                        OR: teacherScope.map((scope) => ({
                          classId: scope.classId,
                          sectionId: scope.sectionId,
                        })),
                      }
                    : {}),
                },
              },
              orderBy: { period: { displayOrder: "asc" } },
              select: {
                id: true,
                periodId: true,
                period: { select: { name: true } },
                teacherAllocation: {
                  select: { classId: true, sectionId: true },
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

      const enrollmentGroups = new Map<
        string,
        {
          academicYearId: string;
          classId: string;
          className: string;
          sectionId: string;
          sectionName: string;
          students: Array<{
            studentId: string;
            admissionNo: string;
            fullName: string;
            rollNo: number | null;
          }>;
        }
      >();
      for (const enrollment of attendanceEnrollments) {
        const key = `${enrollment.classId}:${enrollment.sectionId}`;
        const group = enrollmentGroups.get(key) ?? {
          academicYearId: enrollment.academicYearId,
          classId: enrollment.classId,
          className: enrollment.class.name,
          sectionId: enrollment.sectionId,
          sectionName: enrollment.section.name,
          students: [],
        };
        group.students.push({
          studentId: enrollment.student.id,
          admissionNo: enrollment.student.admissionNo,
          fullName: enrollment.student.fullName?.trim() || enrollment.student.admissionNo,
          rollNo: enrollment.rollNo,
        });
        enrollmentGroups.set(key, group);
      }

      const buildAttendanceTarget = (
        group: (typeof enrollmentGroups extends Map<string, infer T> ? T : never),
        sessionType: "DAILY" | "MORNING" | "AFTERNOON" | "PERIOD",
        timetableId?: string,
        periodId?: string,
        periodName?: string,
      ) => {
        const session = attendanceSessions.find(
          (item) =>
            item.classId === group.classId &&
            item.sectionId === group.sectionId &&
            item.sessionType === sessionType &&
            (sessionType !== "PERIOD" || item.periodId === periodId),
        );
        const recordsByStudent = new Map(
          (session?.records ?? []).map((record) => [record.studentId, record]),
        );
        return {
          key: [group.classId, group.sectionId, sessionType, periodId ?? ""].join(":"),
          academicYearId: group.academicYearId,
          attendanceDate: indiaDate,
          classId: group.classId,
          className: group.className,
          sectionId: group.sectionId,
          sectionName: group.sectionName,
          sessionType,
          timetableId: timetableId ?? null,
          periodName: periodName ?? null,
          sessionId: session?.id ?? null,
          baseUpdatedAt: session?.updatedAt.toISOString() ?? null,
          locked: session?.locked ?? false,
          records: group.students.map((student) => {
            const record = recordsByStudent.get(student.studentId);
            return {
              studentId: student.studentId,
              status: record?.status ?? "PRESENT",
              remarks: record?.remarks ?? null,
              student: {
                admissionNo: student.admissionNo,
                fullName: student.fullName,
                rollNo: student.rollNo,
              },
            };
          }),
        };
      };

      const attendanceTargets = academicYear
        ? [...enrollmentGroups.values()]
          .filter((group) => {
            const expected = attendanceEnrollmentCounts.find(
              (count) =>
                count.classId === group.classId &&
                count.sectionId === group.sectionId,
            )?._count.studentId;
            return expected === group.students.length && group.students.length <= 600;
          })
          .flatMap((group) => {
            if (academicYear.attendanceMode === "MORNING_AFTERNOON") {
              return [
                buildAttendanceTarget(group, "MORNING"),
                buildAttendanceTarget(group, "AFTERNOON"),
              ];
            }
            if (academicYear.attendanceMode === "EVERY_PERIOD") {
              return attendanceTimetable
                .filter(
                  (entry) =>
                    entry.teacherAllocation.classId === group.classId &&
                    entry.teacherAllocation.sectionId === group.sectionId,
                )
                .map((entry) =>
                  buildAttendanceTarget(
                    group,
                    "PERIOD",
                    entry.id,
                    entry.periodId,
                    entry.period.name,
                  ),
                );
            }
            return [buildAttendanceTarget(group, "DAILY")];
          })
        : [];

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
        attendanceTargets,
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
