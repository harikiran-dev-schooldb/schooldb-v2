import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type ReportFilterInput = {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  from?: string;
  to?: string;
};

type AttendanceAggregateRow = {
  scope: "overall" | "daily" | "student";
  studentId: string | null;
  attendanceDate: Date | null;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  count: bigint;
};

type ExamAggregateRow = {
  scope: "overall" | "subject";
  subjectId: string | null;
  subjectName: string | null;
  totalRows: bigint;
  scoredCount: bigint;
  percentageTotal: number;
  passed: bigint;
  graded: bigint;
};

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseDate(value: string | undefined, end = false) {
  if (!value) return null;

  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function percent(numerator: number, denominator: number) {
  return denominator > 0
    ? Number(((numerator / denominator) * 100).toFixed(1))
    : 0;
}

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getSchoolReport(
  schoolId: string,
  input: ReportFilterInput,
) {
  /*
   * ---------------------------------------------------------
   * Resolve reporting scope
   * ---------------------------------------------------------
   *
   * If academicYearId is not supplied, SchoolDB automatically
   * selects the active academic year.
   */

  const [academicYear, selectedClass, sectionCandidate] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        schoolId,

        ...(input.academicYearId
          ? {
              id: input.academicYearId,
            }
          : {
              active: true,
            }),
      },

      orderBy: [{ active: "desc" }, { startDate: "desc" }],

      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    }),

    input.classId
      ? prisma.class.findFirst({
          where: {
            id: input.classId,
            schoolId,
            active: true,
          },

          select: {
            id: true,
            name: true,
          },
        })
      : null,

    input.sectionId && input.classId
      ? prisma.section.findFirst({
          where: {
            id: input.sectionId,
            classId: input.classId,
            active: true,

            class: {
              schoolId,
            },
          },

          select: {
            id: true,
            name: true,
            classId: true,
          },
        })
      : null,
  ]);

  if (!academicYear) {
    return null;
  }

  /*
   * ---------------------------------------------------------
   * Class / section scope
   * ---------------------------------------------------------
   */

  const classId = selectedClass?.id;

  const selectedSection =
    sectionCandidate?.classId === classId ? sectionCandidate : null;

  const sectionId = selectedSection?.id;

  /*
   * ---------------------------------------------------------
   * Reporting date range
   * ---------------------------------------------------------
   *
   * Default behavior:
   *
   * From = 29 days before the default end date
   * To   = Today
   *
   * If today is after the academic year:
   * To = AcademicYear.endDate
   *
   * If today is before the academic year:
   * To = AcademicYear.startDate
   *
   * This gives a 30-day default reporting window.
   * User-provided from/to values are still supported, but
   * they are restricted to the selected academic year.
   */

  const academicYearStart = startOfDay(academicYear.startDate);
  const academicYearEnd = endOfDay(academicYear.endDate);

  const today = endOfDay(new Date());

  let defaultTo: Date;

  if (today < academicYearStart) {
    defaultTo = endOfDay(academicYearStart);
  } else if (today > academicYearEnd) {
    defaultTo = academicYearEnd;
  } else {
    defaultTo = today;
  }

  const requestedFrom = parseDate(input.from);
  const requestedTo = parseDate(input.to, true);

  const defaultFrom = startOfDay(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 29);

  if (defaultFrom < academicYearStart) {
    defaultFrom.setTime(academicYearStart.getTime());
  }

  let from = requestedFrom ?? defaultFrom;
  let to = requestedTo ?? defaultTo;

  /*
   * Do not allow the report range to move outside the
   * selected academic year.
   */

  if (from < academicYearStart) {
    from = academicYearStart;
  }

  if (from > academicYearEnd) {
    from = startOfDay(academicYearEnd);
  }

  if (to < academicYearStart) {
    to = endOfDay(academicYearStart);
  }

  if (to > academicYearEnd) {
    to = academicYearEnd;
  }

  /*
   * Protect against an inverted date range.
   */

  if (from > to) {
    const oldFrom = from;

    from = startOfDay(to);
    to = endOfDay(oldFrom);

    /*
     * Clamp again after swapping.
     */

    if (from < academicYearStart) {
      from = academicYearStart;
    }

    if (to > academicYearEnd) {
      to = academicYearEnd;
    }
  }

  /*
   * ---------------------------------------------------------
   * Student enrollment scope
   * ---------------------------------------------------------
   */

  const enrollmentWhere = {
    schoolId,
    academicYearId: academicYear.id,
    active: true,

    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
  } satisfies Prisma.StudentEnrollmentWhereInput;

  /*
   * ---------------------------------------------------------
   * Attendance scope
   * ---------------------------------------------------------
   */

  const attendanceClassFilter = classId
    ? Prisma.sql`AND s."classId" = ${classId}`
    : Prisma.empty;

  const attendanceSectionFilter = sectionId
    ? Prisma.sql`AND s."sectionId" = ${sectionId}`
    : Prisma.empty;

  /*
   * ---------------------------------------------------------
   * Fee scope
   * ---------------------------------------------------------
   */

  const feeEnrollmentWhere = {
    academicYearId: academicYear.id,
    active: true,

    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
  } satisfies Prisma.StudentEnrollmentWhereInput;

  /*
   * ---------------------------------------------------------
   * Exam scope
   * ---------------------------------------------------------
   */

  const examClassFilter = classId
    ? Prisma.sql`AND es."classId" = ${classId} AND se."classId" = ${classId}`
    : Prisma.empty;

  const examSectionFilter = sectionId
    ? Prisma.sql`AND es."sectionId" = ${sectionId} AND se."sectionId" = ${sectionId}`
    : Prisma.empty;

  /*
   * ---------------------------------------------------------
   * Main report queries
   * ---------------------------------------------------------
   */

  const [
    studentCount,
    genderGroups,
    classGroups,
    classOptions,
    attendanceRows,
    attendanceSessionCount,
    feeCollection,
    feeLedger,
    examRows,
    homeworkCount,
    overdueLoans,
    transportAssignments,
  ] = await Promise.all([
    prisma.studentEnrollment.count({
      where: enrollmentWhere,
    }),

    prisma.student.groupBy({
      by: ["gender"],

      where: {
        schoolId,
        status: "ACTIVE",

        enrollments: {
          some: enrollmentWhere,
        },
      },

      _count: {
        _all: true,
      },
    }),

    prisma.studentEnrollment.groupBy({
      by: ["classId"],
      where: enrollmentWhere,

      _count: {
        _all: true,
      },
    }),

    prisma.class.findMany({
      where: {
        schoolId,
        active: true,
      },

      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],

      select: {
        id: true,
        name: true,
      },
    }),

    prisma.$queryRaw<AttendanceAggregateRow[]>(Prisma.sql`
      SELECT
        CASE
          WHEN GROUPING(a."studentId") = 0 THEN 'student'
          WHEN GROUPING(s."attendanceDate") = 0 THEN 'daily'
          ELSE 'overall'
        END AS scope,
        a."studentId",
        s."attendanceDate",
        a."status"::text AS status,
        COUNT(*)::bigint AS count
      FROM "Attendance" a
      JOIN "AttendanceSession" s ON s."id" = a."sessionId"
      WHERE a."schoolId" = ${schoolId}
        AND s."schoolId" = ${schoolId}
        AND s."academicYearId" = ${academicYear.id}
        AND s."attendanceDate" >= ${from}
        AND s."attendanceDate" <= ${to}
        ${attendanceClassFilter}
        ${attendanceSectionFilter}
      GROUP BY GROUPING SETS (
        (a."status"),
        (s."attendanceDate", a."status"),
        (a."studentId", a."status")
      )
    `),

    prisma.attendanceSession.count({
      where: {
        schoolId,
        academicYearId: academicYear.id,

        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),

        attendanceDate: {
          gte: from,
          lte: to,
        },
      },
    }),

    prisma.feePayment.aggregate({
      where: {
        schoolId,
        status: "SUCCESS",

        studentEnrollment: feeEnrollmentWhere,

        paymentDate: {
          gte: from,
          lte: to,
        },
      },

      _sum: {
        amount: true,
      },

      _count: {
        _all: true,
      },
    }),

    prisma.studentFeeInstallment.aggregate({
      where: {
        studentFeeItem: {
          studentFee: {
            schoolId,
            active: true,

            studentEnrollment: feeEnrollmentWhere,
          },
        },
      },

      _sum: {
        payableAmount: true,
        paidAmount: true,
        concession: true,
      },

      _count: {
        _all: true,
      },
    }),

    prisma.$queryRaw<ExamAggregateRow[]>(Prisma.sql`
      SELECT
        CASE
          WHEN GROUPING(subject."id") = 0 THEN 'subject'
          ELSE 'overall'
        END AS scope,
        subject."id" AS "subjectId",
        subject."name" AS "subjectName",
        COUNT(*)::bigint AS "totalRows",
        COUNT(*) FILTER (
          WHERE m."status"::text = 'PRESENT'
            AND m."marksObtained" IS NOT NULL
            AND es."maxMarks" > 0
        )::bigint AS "scoredCount",
        COALESCE(SUM(
          CASE
            WHEN m."status"::text = 'PRESENT'
              AND m."marksObtained" IS NOT NULL
              AND es."maxMarks" > 0
            THEN ROUND((m."marksObtained" / es."maxMarks") * 100, 1)
            ELSE 0
          END
        ), 0)::double precision AS "percentageTotal",
        COUNT(*) FILTER (
          WHERE m."status"::text = 'PRESENT'
            AND m."marksObtained" IS NOT NULL
            AND es."maxMarks" > 0
            AND es."passMarks" IS NOT NULL
            AND m."marksObtained" >= es."passMarks"
        )::bigint AS passed,
        COUNT(*) FILTER (
          WHERE m."status"::text = 'PRESENT'
            AND m."marksObtained" IS NOT NULL
            AND es."maxMarks" > 0
            AND es."passMarks" IS NOT NULL
        )::bigint AS graded
      FROM "StudentExamMark" m
      JOIN "ExamSchedule" es ON es."id" = m."examScheduleId"
      JOIN "Exam" exam ON exam."id" = es."examId"
      JOIN "Subject" subject ON subject."id" = es."subjectId"
      JOIN "StudentEnrollment" se ON se."id" = m."studentEnrollmentId"
      WHERE m."schoolId" = ${schoolId}
        AND se."schoolId" = ${schoolId}
        AND se."academicYearId" = ${academicYear.id}
        AND se."active" = true
        AND exam."academicYearId" = ${academicYear.id}
        AND es."examDate" >= ${from}
        AND es."examDate" <= ${to}
        ${examClassFilter}
        ${examSectionFilter}
      GROUP BY GROUPING SETS (
        (),
        (subject."id", subject."name")
      )
    `),

    prisma.homework.count({
      where: {
        schoolId,
        active: true,

        ...(classId ? { classId } : {}),

        AND: [
          {
            OR: [
              {
                academicYearId: academicYear.id,
              },
              {
                academicYearId: null,
              },
            ],
          },

          ...(sectionId
            ? [
                {
                  OR: [{ sectionId }, { sectionId: null }],
                },
              ]
            : []),
        ],

        assignedDate: {
          gte: from,
          lte: to,
        },
      },
    }),

    prisma.libraryLoan.count({
      where: {
        schoolId,
        returnedAt: null,

        dueAt: {
          lt: startOfDay(new Date()),
        },

        ...(classId || sectionId
          ? {
              studentEnrollment: {
                is: feeEnrollmentWhere,
              },
            }
          : {}),
      },
    }),

    prisma.studentTransportAssignment.count({
      where: {
        schoolId,
        active: true,

        studentEnrollment: feeEnrollmentWhere,
      },
    }),
  ]);

  /*
   * ---------------------------------------------------------
   * Attendance analytics
   * ---------------------------------------------------------
   */

  const attendance = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
  };

  const daily = new Map<
    string,
    {
      date: string;
      present: number;
      absent: number;
      total: number;
    }
  >();

  const perStudent = new Map<
    string,
    {
      present: number;
      total: number;
    }
  >();

  for (const row of attendanceRows) {
    const count = Number(row.count);

    if (row.scope === "overall") {
      attendance.total += count;

      if (row.status === "PRESENT") attendance.present += count;
      else if (row.status === "ABSENT") attendance.absent += count;
      else if (row.status === "LATE") attendance.late += count;
      else if (row.status === "LEAVE") attendance.leave += count;

      continue;
    }

    if (row.scope === "daily" && row.attendanceDate) {
      const key = isoDate(row.attendanceDate);
      const day = daily.get(key) ?? {
        date: key,
        present: 0,
        absent: 0,
        total: 0,
      };

      day.total += count;
      if (row.status === "PRESENT") day.present += count;
      else if (row.status === "ABSENT") day.absent += count;
      daily.set(key, day);

      continue;
    }

    if (row.scope === "student" && row.studentId) {
      const student = perStudent.get(row.studentId) ?? {
        present: 0,
        total: 0,
      };

      student.total += count;
      if (row.status === "PRESENT") student.present += count;
      perStudent.set(row.studentId, student);
    }
  }

  /*
   * ---------------------------------------------------------
   * Low-attendance students
   * ---------------------------------------------------------
   */

  const lowestAttendanceIds = [...perStudent.entries()]
    .map(([studentId, value]) => ({
      studentId,
      ...value,

      percentage: percent(value.present, value.total),
    }))
    .filter((row) => row.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage || b.total - a.total)
    .slice(0, 8);

  const lowStudentRecords = lowestAttendanceIds.length
    ? await prisma.student.findMany({
        where: {
          schoolId,

          id: {
            in: lowestAttendanceIds.map((row) => row.studentId),
          },
        },

        select: {
          id: true,
          admissionNo: true,
          fullName: true,

          enrollments: {
            where: enrollmentWhere,
            take: 1,

            select: {
              class: {
                select: {
                  name: true,
                },
              },

              section: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })
    : [];

  const lowStudentById = new Map(
    lowStudentRecords.map((student) => [student.id, student]),
  );

  /*
   * ---------------------------------------------------------
   * Student / fee calculations
   * ---------------------------------------------------------
   */

  const classNameById = new Map(
    classOptions.map((item) => [item.id, item.name]),
  );

  const payable = Number(feeLedger._sum.payableAmount ?? 0);

  const paid = Number(feeLedger._sum.paidAmount ?? 0);

  /*
   * ---------------------------------------------------------
   * Academic performance
   * ---------------------------------------------------------
   */

  const examOverall = examRows.find((row) => row.scope === "overall");
  const percentageTotal = examOverall?.percentageTotal ?? 0;
  const scoredCount = Number(examOverall?.scoredCount ?? 0);
  const passed = Number(examOverall?.passed ?? 0);
  const graded = Number(examOverall?.graded ?? 0);

  /*
   * ---------------------------------------------------------
   * Final report
   * ---------------------------------------------------------
   */

  return {
    scope: {
      academicYearId: academicYear.id,
      academicYearName: academicYear.name,

      classId: classId ?? "",
      className: selectedClass?.name ?? "All classes",

      sectionId: sectionId ?? "",
      sectionName: selectedSection?.name ?? "All sections",

      from: isoDate(from),
      to: isoDate(to),
    },

    students: {
      total: studentCount,

      gender: genderGroups.map((row) => ({
        label: row.gender,
        count: row._count._all,
      })),

      classes: classGroups
        .map((row) => ({
          id: row.classId,

          name: classNameById.get(row.classId) ?? "Class",

          count: row._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    },

    attendance: {
      ...attendance,

      sessions: attendanceSessionCount,

      percentage: percent(attendance.present, attendance.total),

      daily: [...daily.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => ({
          ...day,

          percentage: percent(day.present, day.total),
        })),

      low: lowestAttendanceIds.map((row) => {
        const student = lowStudentById.get(row.studentId);

        const enrollment = student?.enrollments[0];

        return {
          studentId: row.studentId,

          admissionNo: student?.admissionNo ?? "-",

          fullName: student?.fullName ?? "Student",

          className: enrollment?.class.name ?? "-",

          sectionName: enrollment?.section.name ?? "-",

          present: row.present,
          total: row.total,
          percentage: row.percentage,
        };
      }),
    },

    fees: {
      collected: Number(feeCollection._sum.amount ?? 0),

      payments: feeCollection._count._all,

      payable,
      paid,

      concession: Number(feeLedger._sum.concession ?? 0),

      outstanding: Math.max(0, payable - paid),

      installments: feeLedger._count._all,
    },

    academics: {
      homework: homeworkCount,
      marks: Number(examOverall?.totalRows ?? 0),

      averagePercentage: scoredCount
        ? Number((percentageTotal / scoredCount).toFixed(1))
        : 0,

      passPercentage: percent(passed, graded),

      subjects: examRows
        .filter(
          (subject) =>
            subject.scope === "subject" &&
            subject.subjectId !== null &&
            subject.subjectName !== null &&
            Number(subject.scoredCount) > 0,
        )
        .map((subject) => {
          const entries = Number(subject.scoredCount);

          return {
            id: subject.subjectId as string,
            name: subject.subjectName as string,
            entries,

            averagePercentage: entries
              ? Number((subject.percentageTotal / entries).toFixed(1))
              : 0,

            passPercentage: percent(
              Number(subject.passed),
              Number(subject.graded),
            ),
          };
        })
        .sort((a, b) => b.averagePercentage - a.averagePercentage)
        .slice(0, 10),
    },

    operations: {
      overdueLoans,
      transportAssignments,
    },
  };
}
