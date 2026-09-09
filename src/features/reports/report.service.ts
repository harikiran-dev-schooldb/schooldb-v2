import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type ReportFilterInput = {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  from?: string;
  to?: string;
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
  const [academicYear, selectedClass, sectionCandidate] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        schoolId,
        ...(input.academicYearId
          ? { id: input.academicYearId }
          : { active: true }),
      },
      orderBy: [{ active: "desc" }, { startDate: "desc" }],
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
    input.classId
      ? prisma.class.findFirst({
          where: { id: input.classId, schoolId, active: true },
          select: { id: true, name: true },
        })
      : null,
    input.sectionId && input.classId
      ? prisma.section.findFirst({
          where: {
            id: input.sectionId,
            classId: input.classId,
            active: true,
            class: { schoolId },
          },
          select: { id: true, name: true, classId: true },
        })
      : null,
  ]);

  if (!academicYear) {
    return null;
  }

  const classId = selectedClass?.id;
  const selectedSection =
    sectionCandidate?.classId === classId ? sectionCandidate : null;
  const sectionId = selectedSection?.id;

  const today = endOfDay(new Date());
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  const requestedFrom = parseDate(input.from);
  const requestedTo = parseDate(input.to, true);
  let from = requestedFrom ?? startOfDay(defaultFrom);
  let to = requestedTo ?? today;
  if (from > to) [from, to] = [startOfDay(to), endOfDay(from)];

  const enrollmentWhere = {
    schoolId,
    academicYearId: academicYear.id,
    active: true,
    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
  } satisfies Prisma.StudentEnrollmentWhereInput;

  const attendanceWhere = {
    schoolId,
    session: {
      academicYearId: academicYear.id,
      ...(classId ? { classId } : {}),
      ...(sectionId ? { sectionId } : {}),
      attendanceDate: { gte: from, lte: to },
    },
  } satisfies Prisma.AttendanceWhereInput;

  const feeEnrollmentWhere = {
    academicYearId: academicYear.id,
    active: true,
    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
  } satisfies Prisma.StudentEnrollmentWhereInput;

  const examWhere = {
    schoolId,
    studentEnrollment: enrollmentWhere,
    examSchedule: {
      exam: { academicYearId: academicYear.id },
      examDate: { gte: from, lte: to },
      ...(classId ? { classId } : {}),
      ...(sectionId ? { sectionId } : {}),
    },
  } satisfies Prisma.StudentExamMarkWhereInput;

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
    prisma.studentEnrollment.count({ where: enrollmentWhere }),
    prisma.student.groupBy({
      by: ["gender"],
      where: {
        schoolId,
        status: "ACTIVE",
        enrollments: { some: enrollmentWhere },
      },
      _count: { _all: true },
    }),
    prisma.studentEnrollment.groupBy({
      by: ["classId"],
      where: enrollmentWhere,
      _count: { _all: true },
    }),
    prisma.class.findMany({
      where: { schoolId, active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.attendance.findMany({
      where: attendanceWhere,
      select: {
        studentId: true,
        status: true,
        session: { select: { attendanceDate: true } },
      },
      orderBy: { session: { attendanceDate: "asc" } },
    }),
    prisma.attendanceSession.count({
      where: {
        schoolId,
        academicYearId: academicYear.id,
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        attendanceDate: { gte: from, lte: to },
      },
    }),
    prisma.feePayment.aggregate({
      where: {
        schoolId,
        status: "SUCCESS",
        studentEnrollment: feeEnrollmentWhere,
        paymentDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { _all: true },
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
      _sum: { payableAmount: true, paidAmount: true, concession: true },
      _count: { _all: true },
    }),
    prisma.studentExamMark.findMany({
      where: examWhere,
      select: {
        marksObtained: true,
        status: true,
        examSchedule: {
          select: {
            maxMarks: true,
            passMarks: true,
            subject: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.homework.count({
      where: {
        schoolId,
        active: true,
        ...(classId ? { classId } : {}),
        AND: [
          {
            OR: [{ academicYearId: academicYear.id }, { academicYearId: null }],
          },
          ...(sectionId ? [{ OR: [{ sectionId }, { sectionId: null }] }] : []),
        ],
        assignedDate: { gte: from, lte: to },
      },
    }),
    prisma.libraryLoan.count({
      where: {
        schoolId,
        returnedAt: null,
        dueAt: { lt: startOfDay(new Date()) },
        ...(classId || sectionId
          ? { studentEnrollment: { is: feeEnrollmentWhere } }
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

  const attendance = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: attendanceRows.length,
  };
  const daily = new Map<
    string,
    { date: string; present: number; total: number }
  >();
  const perStudent = new Map<string, { present: number; total: number }>();

  for (const row of attendanceRows) {
    const key = isoDate(row.session.attendanceDate);
    const day = daily.get(key) ?? { date: key, present: 0, total: 0 };
    day.total += 1;
    if (row.status === "PRESENT") day.present += 1;
    daily.set(key, day);

    const student = perStudent.get(row.studentId) ?? { present: 0, total: 0 };
    student.total += 1;
    if (row.status === "PRESENT") student.present += 1;
    perStudent.set(row.studentId, student);

    if (row.status === "PRESENT") attendance.present += 1;
    else if (row.status === "ABSENT") attendance.absent += 1;
    else if (row.status === "LATE") attendance.late += 1;
    else if (row.status === "LEAVE") attendance.leave += 1;
  }

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
          id: { in: lowestAttendanceIds.map((row) => row.studentId) },
        },
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          enrollments: {
            where: enrollmentWhere,
            take: 1,
            select: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
      })
    : [];
  const lowStudentById = new Map(
    lowStudentRecords.map((student) => [student.id, student]),
  );

  const classNameById = new Map(
    classOptions.map((item) => [item.id, item.name]),
  );
  const payable = Number(feeLedger._sum.payableAmount ?? 0);
  const paid = Number(feeLedger._sum.paidAmount ?? 0);

  const subjectMap = new Map<
    string,
    {
      id: string;
      name: string;
      percentageTotal: number;
      count: number;
      passed: number;
      graded: number;
    }
  >();
  let percentageTotal = 0;
  let scoredCount = 0;
  let passed = 0;
  let graded = 0;
  for (const mark of examRows) {
    if (mark.status !== "PRESENT" || mark.marksObtained === null) continue;
    const maximum = Number(mark.examSchedule.maxMarks);
    if (maximum <= 0) continue;
    const score = Number(mark.marksObtained);
    const scorePercent = percent(score, maximum);
    percentageTotal += scorePercent;
    scoredCount += 1;
    if (mark.examSchedule.passMarks !== null) {
      graded += 1;
      if (score >= Number(mark.examSchedule.passMarks)) passed += 1;
    }
    const subject = mark.examSchedule.subject;
    const current = subjectMap.get(subject.id) ?? {
      id: subject.id,
      name: subject.name,
      percentageTotal: 0,
      count: 0,
      passed: 0,
      graded: 0,
    };
    current.percentageTotal += scorePercent;
    current.count += 1;
    if (mark.examSchedule.passMarks !== null) {
      current.graded += 1;
      if (score >= Number(mark.examSchedule.passMarks)) current.passed += 1;
    }
    subjectMap.set(subject.id, current);
  }

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
      daily: [...daily.values()].map((day) => ({
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
      marks: examRows.length,
      averagePercentage: scoredCount
        ? Number((percentageTotal / scoredCount).toFixed(1))
        : 0,
      passPercentage: percent(passed, graded),
      subjects: [...subjectMap.values()]
        .map((subject) => ({
          id: subject.id,
          name: subject.name,
          entries: subject.count,
          averagePercentage: subject.count
            ? Number((subject.percentageTotal / subject.count).toFixed(1))
            : 0,
          passPercentage: percent(subject.passed, subject.graded),
        }))
        .sort((a, b) => b.averagePercentage - a.averagePercentage)
        .slice(0, 10),
    },
    operations: {
      overdueLoans,
      transportAssignments,
    },
  };
}
