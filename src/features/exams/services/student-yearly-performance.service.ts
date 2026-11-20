import { attendanceService } from "@/features/attendance/services/attendance.service";
import { prisma } from "@/lib/prisma";

import { isAssessmentEntryMissing } from "../assessment";
import { annualGrade, type YearlyResultStatus } from "../yearly-performance";

function percentage(obtained: number, maximum: number) {
  return maximum > 0
    ? Number(((obtained / maximum) * 100).toFixed(2))
    : null;
}

export async function getStudentYearlyPerformance(
  schoolId: string,
  studentId: string,
  requestedAcademicYearId?: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      imageUrl: true,
      school: {
        select: { name: true, slug: true, logo: true, updatedAt: true },
      },
      enrollments: {
        orderBy: [
          { active: "desc" },
          { academicYear: { startDate: "desc" } },
        ],
        select: {
          id: true,
          academicYearId: true,
          classId: true,
          sectionId: true,
          rollNo: true,
          active: true,
          academicYear: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!student) return null;

  const enrollment = requestedAcademicYearId
    ? student.enrollments.find(
        (item) => item.academicYearId === requestedAcademicYearId,
      )
    : student.enrollments[0];

  if (!enrollment) {
    return {
      student,
      enrollment: null,
      academicYears: student.enrollments.map((item) => item.academicYear),
      exams: [],
      subjects: [],
      attendance: null,
      summary: null,
      observation: null,
    };
  }

  const [examRecords, attendanceReport] = await Promise.all([
    prisma.exam.findMany({
      where: {
        schoolId,
        academicYearId: enrollment.academicYearId,
        active: true,
        status: "COMPLETED",
        schedules: {
          some: {
            classId: enrollment.classId,
            OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }],
          },
        },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        schedules: {
          where: {
            classId: enrollment.classId,
            OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }],
          },
          select: {
            id: true,
            sectionId: true,
            subjectId: true,
            assessmentType: true,
            maxMarks: true,
            passMarks: true,
            subject: { select: { id: true, name: true, code: true } },
            marks: {
              where: { studentEnrollmentId: enrollment.id },
              take: 1,
              select: {
                marksObtained: true,
                grade: true,
                status: true,
                remarks: true,
              },
            },
          },
        },
      },
      orderBy: [{ startDate: "asc" }, { name: "asc" }],
    }),
    attendanceService.studentAttendanceReport(
      schoolId,
      studentId,
      enrollment.academicYearId,
    ),
  ]);

  const subjectMap = new Map<
    string,
    {
      id: string;
      name: string;
      code: string | null;
      results: Array<{
        examId: string;
        examName: string;
        assessmentType: "MARKS" | "GRADE";
        marksObtained: number | null;
        maxMarks: number;
        passMarks: number | null;
        grade: string | null;
        status: YearlyResultStatus;
        remarks: string | null;
      }>;
    }
  >();

  const exams = examRecords.map((exam) => {
    const schedulesBySubject = new Map<string, (typeof exam.schedules)[number]>();
    for (const schedule of exam.schedules) {
      const existing = schedulesBySubject.get(schedule.subjectId);
      if (
        !existing ||
        (existing.sectionId === null && schedule.sectionId === enrollment.sectionId)
      ) {
        schedulesBySubject.set(schedule.subjectId, schedule);
      }
    }

    let obtained = 0;
    let maximum = 0;
    let pending = false;
    let failed = false;

    for (const schedule of schedulesBySubject.values()) {
      const mark = schedule.marks[0];
      const maxMarks = Number(schedule.maxMarks);
      const passMarks =
        schedule.passMarks === null ? null : Number(schedule.passMarks);
      const marksObtained =
        mark?.marksObtained === null || mark?.marksObtained === undefined
          ? null
          : Number(mark.marksObtained);
      let status: YearlyResultStatus;

      if (!mark || isAssessmentEntryMissing(schedule.assessmentType, mark)) {
        status = "PENDING";
        pending = true;
      } else if (mark.status === "ABSENT" || mark.status === "EXEMPTED") {
        status = mark.status;
        failed ||= status === "ABSENT";
      } else if (schedule.assessmentType === "GRADE") {
        status = "PASS";
      } else {
        status =
          passMarks === null || Number(marksObtained ?? 0) >= passMarks
            ? "PASS"
            : "FAIL";
        failed ||= status === "FAIL";
      }

      if (schedule.assessmentType === "MARKS" && status !== "EXEMPTED") {
        if (status !== "PENDING") maximum += maxMarks;
        if (status === "PASS" || status === "FAIL") {
          obtained += marksObtained ?? 0;
        }
      }

      const subject = subjectMap.get(schedule.subjectId) ?? {
        ...schedule.subject,
        results: [],
      };
      subject.results.push({
        examId: exam.id,
        examName: exam.name,
        assessmentType: schedule.assessmentType,
        marksObtained,
        maxMarks,
        passMarks,
        grade: mark?.grade ?? null,
        status,
        remarks: mark?.remarks ?? null,
      });
      subjectMap.set(schedule.subjectId, subject);
    }

    return {
      id: exam.id,
      name: exam.name,
      startDate: exam.startDate,
      endDate: exam.endDate,
      obtained,
      maximum,
      percentage: percentage(obtained, maximum),
      status: pending ? ("PENDING" as const) : failed ? ("FAIL" as const) : ("PASS" as const),
    };
  });

  const subjects = Array.from(subjectMap.values())
    .map((subject) => {
      const numericResults = subject.results.filter(
        (result) =>
          result.assessmentType === "MARKS" &&
          result.status !== "EXEMPTED" &&
          result.status !== "PENDING",
      );
      const obtained = numericResults.reduce(
        (sum, result) =>
          sum +
          (result.status === "ABSENT" ? 0 : (result.marksObtained ?? 0)),
        0,
      );
      const maximum = numericResults.reduce(
        (sum, result) => sum + result.maxMarks,
        0,
      );
      const required = numericResults.reduce(
        (sum, result) => sum + (result.passMarks ?? 0),
        0,
      );
      const pending = subject.results.some((result) => result.status === "PENDING");
      const assessed = subject.results.filter(
        (result) => result.status !== "EXEMPTED" && result.status !== "PENDING",
      );
      const allExempted =
        subject.results.length > 0 &&
        subject.results.every((result) => result.status === "EXEMPTED");
      const allAbsent =
        assessed.length > 0 &&
        assessed.every((result) => result.status === "ABSENT");
      const failed =
        allAbsent ||
        numericResults.some((result) => result.status === "FAIL") ||
        (maximum > 0 && obtained < required);
      const status: YearlyResultStatus = pending
        ? "PENDING"
        : allExempted
          ? "EXEMPTED"
          : allAbsent
            ? "ABSENT"
            : failed
              ? "FAIL"
              : "PASS";
      const annualPercentage = percentage(obtained, maximum);

      return {
        ...subject,
        obtained,
        maximum,
        percentage: annualPercentage,
        grade: annualGrade(annualPercentage),
        status,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalObtained = subjects.reduce((sum, subject) => sum + subject.obtained, 0);
  const totalMaximum = subjects.reduce((sum, subject) => sum + subject.maximum, 0);
  const annualPercentage = percentage(totalObtained, totalMaximum);
  const pending = subjects.some((subject) => subject.status === "PENDING");
  const failed = subjects.some(
    (subject) => subject.status === "FAIL" || subject.status === "ABSENT",
  );
  const overallStatus: YearlyResultStatus = pending ? "PENDING" : failed ? "FAIL" : "PASS";
  const scoredSubjects = subjects
    .filter((subject) => subject.percentage !== null)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  const strengths = scoredSubjects.filter((subject) => (subject.percentage ?? 0) >= 75).slice(0, 2);
  const support = scoredSubjects.filter(
    (subject) => subject.status === "FAIL" || (subject.percentage ?? 100) < 40,
  );
  const observation = [
    strengths.length
      ? `Strong performance in ${strengths.map((subject) => subject.name).join(" and ")}.`
      : null,
    support.length
      ? `${support.map((subject) => subject.name).join(" and ")} ${support.length === 1 ? "requires" : "require"} targeted academic support.`
      : "The student has met the annual subject requirements.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    student,
    enrollment,
    academicYears: student.enrollments.map((item) => item.academicYear),
    exams,
    subjects,
    attendance: attendanceReport.summary,
    summary: {
      obtained: totalObtained,
      maximum: totalMaximum,
      percentage: annualPercentage,
      grade: annualGrade(annualPercentage),
      status: overallStatus,
      passedSubjects: subjects.filter((subject) => subject.status === "PASS").length,
      failedSubjects: subjects.filter(
        (subject) => subject.status === "FAIL" || subject.status === "ABSENT",
      ).length,
    },
    observation,
  };
}

export type StudentYearlyPerformance = NonNullable<
  Awaited<ReturnType<typeof getStudentYearlyPerformance>>
>;
