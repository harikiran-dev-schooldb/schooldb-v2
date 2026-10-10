import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ClassSectionScope = {
  academicYearId: string;
  classId: string;
  sectionId: string;
};

type SummaryFilters = {
  syllabusId?: string;
  branchId?: string;
  classId?: string;
  sectionId?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  isRte?: boolean;
};

type SummaryAccess = {
  attendance: boolean;
  fees: boolean;
  classSections?: ClassSectionScope[];
};

export async function studentDirectorySummary(
  schoolId: string,
  filters: SummaryFilters,
  access: SummaryAccess,
) {
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, active: true },
    select: { id: true, name: true },
  });

  const teacherScopes = academicYear && access.classSections
    ? access.classSections.filter((item) => item.academicYearId === academicYear.id)
    : undefined;
  const classFilter: Prisma.ClassWhereInput = {
    ...(filters.classId ? { id: filters.classId } : {}),
    ...(filters.branchId
      ? { branchId: filters.branchId }
      : filters.syllabusId
        ? { branch: { syllabusId: filters.syllabusId } }
        : {}),
  };
  const studentFilter: Prisma.StudentWhereInput = {
    schoolId,
    status: "ACTIVE",
    ...(filters.gender ? { gender: filters.gender } : {}),
    ...(filters.isRte !== undefined ? { isRte: filters.isRte } : {}),
  };

  const activeStudentWhere: Prisma.StudentWhereInput = {
    schoolId,
    status: "ACTIVE",
    ...(teacherScopes
      ? {
          enrollments: {
            some: {
              active: true,
              academicYearId: academicYear?.id,
              OR: teacherScopes.map((item) => ({
                classId: item.classId,
                sectionId: item.sectionId,
              })),
            },
          },
        }
      : {}),
  };

  const [activeStudents, genderGroups] = await Promise.all([
    prisma.student.count({ where: activeStudentWhere }),
    prisma.student.groupBy({
      by: ["gender"],
      where: activeStudentWhere,
      _count: { _all: true },
    }),
  ]);

  const genderCounts = { male: 0, female: 0, other: 0 };
  for (const group of genderGroups) {
    genderCounts[group.gender.toLowerCase() as keyof typeof genderCounts] = group._count._all;
  }

  if (!academicYear) {
    return {
      academicYearName: null,
      activeStudents,
      genderCounts,
      attendance: null,
      fees: null,
      classes: [],
    };
  }

  const enrollmentWhere: Prisma.StudentEnrollmentWhereInput = {
    schoolId,
    academicYearId: academicYear.id,
    active: true,
    student: studentFilter,
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(Object.keys(classFilter).length ? { class: classFilter } : {}),
    ...(teacherScopes
      ? {
          OR: teacherScopes.map((item) => ({
            classId: item.classId,
            sectionId: item.sectionId,
          })),
        }
      : {}),
  };

  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(`${indiaDate}T00:00:00.000Z`);

  const [enrollments, attendanceRows, feeRows] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      select: {
        id: true,
        classId: true,
        class: {
          select: {
            name: true,
            displayOrder: true,
            branch: { select: { name: true, syllabus: { select: { name: true } } } },
          },
        },
      },
    }),
    access.attendance
      ? prisma.attendance.findMany({
          where: {
            schoolId,
            student: studentFilter,
            session: {
              schoolId,
              academicYearId: academicYear.id,
              attendanceDate: today,
              ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
              ...(Object.keys(classFilter).length ? { class: classFilter } : {}),
              ...(teacherScopes
                ? {
                    OR: teacherScopes.map((item) => ({
                      classId: item.classId,
                      sectionId: item.sectionId,
                    })),
                  }
                : {}),
            },
          },
          select: { status: true, session: { select: { classId: true } } },
        })
      : Promise.resolve([]),
    access.fees
      ? prisma.studentFeeInstallment.findMany({
          where: {
            studentFeeItem: {
              studentFee: {
                schoolId,
                active: true,
                feePlan: { academicYearId: academicYear.id },
                studentEnrollment: enrollmentWhere,
              },
            },
          },
          select: {
            paidAmount: true,
            payableAmount: true,
            studentFeeItem: {
              select: {
                studentFee: { select: { studentEnrollment: { select: { classId: true } } } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const classes = new Map<
    string,
    {
      classId: string;
      className: string;
      branchName: string;
      syllabusName: string;
      displayOrder: number;
      students: number;
      attendancePresent: number;
      attendanceMarked: number;
      feesPaid: number;
      feesOutstanding: number;
    }
  >();
  for (const enrollment of enrollments) {
    const current = classes.get(enrollment.classId) ?? {
      classId: enrollment.classId,
      className: enrollment.class.name,
      branchName: enrollment.class.branch.name,
      syllabusName: enrollment.class.branch.syllabus.name,
      displayOrder: enrollment.class.displayOrder,
      students: 0,
      attendancePresent: 0,
      attendanceMarked: 0,
      feesPaid: 0,
      feesOutstanding: 0,
    };
    current.students += 1;
    classes.set(enrollment.classId, current);
  }

  let attendancePresent = 0;
  for (const row of attendanceRows) {
    const item = classes.get(row.session.classId);
    if (!item) continue;
    item.attendanceMarked += 1;
    if (row.status === "PRESENT" || row.status === "LATE") {
      item.attendancePresent += 1;
      attendancePresent += 1;
    }
  }

  let feesPaid = 0;
  let feesOutstanding = 0;
  for (const row of feeRows) {
    const item = classes.get(
      row.studentFeeItem.studentFee.studentEnrollment.classId,
    );
    if (!item) continue;
    const paid = Number(row.paidAmount);
    const outstanding = Math.max(0, Number(row.payableAmount) - paid);
    item.feesPaid += paid;
    item.feesOutstanding += outstanding;
    feesPaid += paid;
    feesOutstanding += outstanding;
  }

  return {
    academicYearName: academicYear.name,
    activeStudents,
    genderCounts,
    attendance: access.attendance
      ? {
          present: attendancePresent,
          marked: attendanceRows.length,
          percentage: attendanceRows.length
            ? Math.round((attendancePresent / attendanceRows.length) * 100)
            : 0,
        }
      : null,
    fees: access.fees ? { paid: feesPaid, outstanding: feesOutstanding } : null,
    classes: [...classes.values()]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.className.localeCompare(b.className))
      .map((item) => ({
        ...item,
        attendancePercentage: item.attendanceMarked
          ? Math.round((item.attendancePresent / item.attendanceMarked) * 100)
          : null,
      })),
  };
}
