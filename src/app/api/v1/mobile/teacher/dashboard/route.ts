import { AttendanceSessionType, WeekDay } from "@/generated/prisma/client";
import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const SCHOOL_TIME_ZONE = "Asia/Kolkata";

function schoolDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
  })
    .format(now)
    .toUpperCase();
}

function schoolDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

const WEEK_DAYS: Array<WeekDay | null> = [
  null,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

function nextSchoolDates(date: string) {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const candidate = new Date(cursor);
    candidate.setUTCDate(candidate.getUTCDate() + index + 1);
    return {
      date: candidate.toISOString().slice(0, 10),
      day: WEEK_DAYS[candidate.getUTCDay()],
    };
  });
}

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);
    const date = schoolDate();
    const dayName = schoolDay();
    const day = Object.values(WeekDay).includes(dayName as WeekDay)
      ? (dayName as WeekDay)
      : null;
    const upcomingDates = nextSchoolDates(date);

    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId: membership.schoolId, active: true },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, attendanceMode: true },
    });

    if (!academicYear) {
      return ApiResponse.success({
        teacherName: teacher.fullName,
        schoolName: membership.school.name,
        date,
        day: dayName,
        academicYearName: null,
        attendanceMode: null,
        periods: [],
        dailyTargets: [],
        studentGroups: [],
        upcoming: null,
      });
    }

    const allocations = await prisma.teacherAllocation.findMany({
      where: {
        schoolId: membership.schoolId,
        academicYearId: academicYear.id,
        teacherId: teacher.id,
        active: true,
      },
      distinct: ["classId", "sectionId"],
      orderBy: [{ class: { name: "asc" } }, { section: { name: "asc" } }],
      select: {
        classId: true,
        sectionId: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    const [timetable, sessions, enrollments] = await Promise.all([
      prisma.timetable.findMany({
        where: {
          schoolId: membership.schoolId,
          academicYearId: academicYear.id,
          day: {
            in: [day, ...upcomingDates.map((item) => item.day)].filter(
              (item): item is WeekDay => item !== null,
            ),
          },
          active: true,
          teacherAllocation: { teacherId: teacher.id, active: true },
        },
        orderBy: { period: { displayOrder: "asc" } },
        select: {
          id: true,
          day: true,
          periodId: true,
          period: { select: { name: true, startTime: true, endTime: true } },
          teacherAllocation: {
            select: {
              classId: true,
              sectionId: true,
              subject: { select: { name: true } },
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
      }),
      prisma.attendanceSession.findMany({
        where: {
          schoolId: membership.schoolId,
          academicYearId: academicYear.id,
          attendanceDate: new Date(`${date}T00:00:00.000Z`),
          OR: [
            { teacherId: teacher.id, sessionType: "PERIOD" },
            ...(allocations.length > 0
              ? [{
                  sessionType: {
                    in: [
                      AttendanceSessionType.DAILY,
                      AttendanceSessionType.MORNING,
                      AttendanceSessionType.AFTERNOON,
                    ],
                  },
                  OR: allocations.map((item) => ({
                    classId: item.classId,
                    sectionId: item.sectionId,
                  })),
                }]
              : []),
          ],
        },
        select: {
          id: true,
          periodId: true,
          classId: true,
          sectionId: true,
          locked: true,
          _count: { select: { records: true } },
        },
      }),
      allocations.length > 0
        ? prisma.studentEnrollment.findMany({
            where: {
              schoolId: membership.schoolId,
              academicYearId: academicYear.id,
              active: true,
              student: { status: "ACTIVE" },
              OR: allocations.map((item) => ({
                classId: item.classId,
                sectionId: item.sectionId,
              })),
            },
            orderBy: [
              { class: { displayOrder: "asc" } },
              { section: { displayOrder: "asc" } },
              { rollNo: "asc" },
              { student: { fullName: "asc" } },
            ],
            select: {
              id: true,
              classId: true,
              sectionId: true,
              studentId: true,
              rollNo: true,
              student: {
                select: {
                  admissionNo: true,
                  fullName: true,
                  imageUrl: true,
                  status: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const toPeriod = (entry: (typeof timetable)[number], includeAttendance: boolean) => {
      const allocation = entry.teacherAllocation;
      const session = includeAttendance
        ? sessions.find(
            (item) =>
              item.periodId === entry.periodId &&
              item.classId === allocation.classId &&
              item.sectionId === allocation.sectionId,
          )
        : undefined;
      return {
        timetableId: entry.id,
        academicYearId: academicYear.id,
        classId: allocation.classId,
        sectionId: allocation.sectionId,
        periodName: entry.period.name,
        startTime: entry.period.startTime,
        endTime: entry.period.endTime,
        subjectName: allocation.subject.name,
        className: allocation.class.name,
        sectionName: allocation.section.name,
        attendanceSessionId: session?.id ?? null,
        attendanceCount: session?._count.records ?? 0,
        attendanceLocked: session?.locked ?? false,
      };
    };

    const nextTeachingDate = upcomingDates.find((candidate) =>
      candidate.day !== null && timetable.some((entry) => entry.day === candidate.day),
    );

    const studentGroups = allocations.map((allocation) => ({
      academicYearId: academicYear.id,
      classId: allocation.classId,
      sectionId: allocation.sectionId,
      className: allocation.class.name,
      sectionName: allocation.section.name,
      students: enrollments
        .filter(
          (enrollment) =>
            enrollment.classId === allocation.classId &&
            enrollment.sectionId === allocation.sectionId,
        )
        .map((enrollment) => ({
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          admissionNo: enrollment.student.admissionNo,
          fullName:
            enrollment.student.fullName?.trim() ||
            enrollment.student.admissionNo,
          rollNo: enrollment.rollNo,
          imageUrl: enrollment.student.imageUrl,
          status: enrollment.student.status,
        })),
    }));

    return ApiResponse.success({
      teacherName: teacher.fullName,
      schoolName: membership.school.name,
      date,
      day: dayName,
      academicYearName: academicYear.name,
      attendanceMode: academicYear.attendanceMode,
      periods: timetable.filter((entry) => entry.day === day).map((entry) => toPeriod(entry, true)),
      dailyTargets: academicYear.attendanceMode === "EVERY_PERIOD"
        ? []
        : allocations.map((allocation) => {
            const session = sessions.find(
              (item) =>
                item.classId === allocation.classId &&
                item.sectionId === allocation.sectionId &&
                item.periodId === null,
            );
            return {
              academicYearId: academicYear.id,
              classId: allocation.classId,
              sectionId: allocation.sectionId,
              className: allocation.class.name,
              sectionName: allocation.section.name,
              attendanceSessionId: session?.id ?? null,
              attendanceCount: session?._count.records ?? 0,
              attendanceLocked: session?.locked ?? false,
            };
          }),
      studentGroups,
      upcoming: nextTeachingDate
        ? {
            date: nextTeachingDate.date,
            day: nextTeachingDate.day,
            periods: timetable
              .filter((entry) => entry.day === nextTeachingDate.day)
              .map((entry) => toPeriod(entry, false)),
          }
        : null,
    });
  });
}
