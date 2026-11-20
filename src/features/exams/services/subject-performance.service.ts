import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { isAssessmentEntryMissing } from "../assessment";
import {
  assignedExamScheduleFilter,
  canViewExamSchedule,
  getExamTeacherAssignments,
  type ExamTeacherAssignment,
} from "../exam-teacher-scope";

type Options = {
  examId: string;
  schoolId: string;
  classId: string;
  sectionId?: string | null;
  teacherScope?: readonly ExamTeacherAssignment[];
};

type CellStatus = "PENDING" | "PASS" | "FAIL" | "ABSENT" | "EXEMPTED";

export const subjectPerformanceService = {
  async get({ examId, schoolId, classId, sectionId, teacherScope }: Options) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId, status: { not: "CANCELLED" } },
      select: {
        id: true,
        name: true,
        status: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true } },
      },
    });
    if (!exam) throw new ApiError(404, "Exam not found.");

    const assignments = teacherScope
      ? getExamTeacherAssignments(teacherScope, exam.academicYearId, classId, sectionId)
      : undefined;
    if (assignments?.length === 0) {
      const classRecord = await prisma.class.findFirst({
        where: { id: classId, schoolId },
        select: { id: true, name: true },
      });
      if (!classRecord) throw new ApiError(404, "The selected class was not found.");
      return { exam, scope: null, subjects: [], students: [], totals: emptyTotals() };
    }

    const schedules = await prisma.examSchedule.findMany({
      where: {
        examId,
        schoolId,
        classId,
        ...(assignments
          ? { OR: assignments.map(assignedExamScheduleFilter) }
          : sectionId
            ? { OR: [{ sectionId }, { sectionId: null }] }
            : {}),
      },
      select: {
        id: true,
        sectionId: true,
        subjectId: true,
        subject: { select: { id: true, name: true } },
        assessmentType: true,
        maxMarks: true,
        passMarks: true,
      },
      orderBy: { subject: { name: "asc" } },
    });

    const [classRecord, sectionRecord] = await Promise.all([
      prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true, name: true } }),
      sectionId
        ? prisma.section.findFirst({
            where: { id: sectionId, classId, class: { schoolId } },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);
    if (!classRecord || (sectionId && !sectionRecord)) {
      throw new ApiError(404, "The selected class or section was not found.");
    }

    if (schedules.length === 0) {
      return { exam, scope: null, subjects: [], students: [], totals: emptyTotals() };
    }

    const assignedSectionIds = assignments
      ? [...new Set(assignments.map((assignment) => assignment.sectionId))]
      : undefined;
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId: exam.academicYearId,
        classId,
        active: true,
        student: { schoolId, status: "ACTIVE" },
        ...(assignedSectionIds
          ? { sectionId: { in: assignedSectionIds } }
          : sectionId
            ? { sectionId }
            : {}),
      },
      select: {
        id: true,
        sectionId: true,
        rollNo: true,
        section: { select: { id: true, name: true } },
        student: {
          select: { id: true, admissionNo: true, fullName: true, imageUrl: true },
        },
        examMarks: {
          where: { schoolId, examScheduleId: { in: schedules.map((schedule) => schedule.id) } },
          select: {
            examScheduleId: true,
            marksObtained: true,
            grade: true,
            status: true,
          },
        },
      },
    });

    const subjectRecords = new Map<string, {
      id: string;
      name: string;
      assessmentType: "MARKS" | "GRADE" | "MIXED";
      maxMarks: Set<number>;
      passMarks: Set<number | null>;
      assessed: number;
      pending: number;
      passed: number;
      failed: number;
      absent: number;
      exempted: number;
      percentages: number[];
    }>();
    schedules.forEach((schedule) => {
      const existing = subjectRecords.get(schedule.subjectId);
      const type = schedule.assessmentType;
      if (existing) {
        existing.assessmentType = existing.assessmentType === type ? existing.assessmentType : "MIXED";
        existing.maxMarks.add(Number(schedule.maxMarks));
        existing.passMarks.add(schedule.passMarks === null ? null : Number(schedule.passMarks));
      } else {
        subjectRecords.set(schedule.subjectId, {
          id: schedule.subject.id,
          name: schedule.subject.name,
          assessmentType: type,
          maxMarks: new Set([Number(schedule.maxMarks)]),
          passMarks: new Set([schedule.passMarks === null ? null : Number(schedule.passMarks)]),
          assessed: 0,
          pending: 0,
          passed: 0,
          failed: 0,
          absent: 0,
          exempted: 0,
          percentages: [],
        });
      }
    });

    let totalEntries = 0;
    let completedEntries = 0;
    let passedEntries = 0;
    let failedEntries = 0;
    let pendingEntries = 0;

    const students = enrollments.map((enrollment) => {
      const scheduleBySubject = new Map<string, (typeof schedules)[number]>();
      schedules.forEach((schedule) => {
        if (schedule.sectionId !== null && schedule.sectionId !== enrollment.sectionId) return;
        if (assignments && !canViewExamSchedule(assignments, enrollment.sectionId, schedule.subjectId)) return;
        const existing = scheduleBySubject.get(schedule.subjectId);
        if (!existing || (existing.sectionId === null && schedule.sectionId !== null)) {
          scheduleBySubject.set(schedule.subjectId, schedule);
        }
      });
      const markBySchedule = new Map(enrollment.examMarks.map((mark) => [mark.examScheduleId, mark]));
      const results = [...scheduleBySubject.values()].map((schedule) => {
        const mark = markBySchedule.get(schedule.id);
        let status: CellStatus;
        if (!mark || isAssessmentEntryMissing(schedule.assessmentType, mark)) status = "PENDING";
        else if (mark.status === "ABSENT" || mark.status === "EXEMPTED") status = mark.status;
        else if (schedule.assessmentType === "GRADE" || schedule.passMarks === null) status = "PASS";
        else status = Number(mark.marksObtained ?? 0) >= Number(schedule.passMarks) ? "PASS" : "FAIL";

        const percentage = schedule.assessmentType === "MARKS" && status !== "PENDING" && status !== "EXEMPTED"
          ? Number(((status === "ABSENT" ? 0 : Number(mark?.marksObtained ?? 0)) / Number(schedule.maxMarks) * 100).toFixed(2))
          : null;
        const summary = subjectRecords.get(schedule.subjectId)!;
        totalEntries += 1;
        if (status === "PENDING") {
          pendingEntries += 1;
          summary.pending += 1;
        } else {
          completedEntries += 1;
          summary.assessed += 1;
          if (status === "PASS") { passedEntries += 1; summary.passed += 1; }
          if (status === "FAIL") { failedEntries += 1; summary.failed += 1; }
          if (status === "ABSENT") { failedEntries += 1; summary.failed += 1; summary.absent += 1; }
          if (status === "EXEMPTED") summary.exempted += 1;
          if (percentage !== null && status !== "EXEMPTED") summary.percentages.push(percentage);
        }

        return {
          subjectId: schedule.subjectId,
          assessmentType: schedule.assessmentType,
          maxMarks: Number(schedule.maxMarks),
          passMarks: schedule.passMarks === null ? null : Number(schedule.passMarks),
          marksObtained: mark?.marksObtained === null || mark?.marksObtained === undefined
            ? null
            : Number(mark.marksObtained),
          grade: mark?.grade ?? null,
          status,
          percentage,
        };
      });
      return {
        studentId: enrollment.student.id,
        admissionNo: enrollment.student.admissionNo,
        fullName: enrollment.student.fullName || "Unnamed Student",
        imageUrl: enrollment.student.imageUrl,
        rollNo: enrollment.rollNo,
        section: enrollment.section,
        results,
      };
    }).sort((left, right) =>
      left.section.name.localeCompare(right.section.name)
      || (left.rollNo ?? Number.MAX_SAFE_INTEGER) - (right.rollNo ?? Number.MAX_SAFE_INTEGER)
      || left.fullName.localeCompare(right.fullName),
    );

    const subjects = [...subjectRecords.values()].map((subject) => {
      const averagePercentage = average(subject.percentages);
      return {
        id: subject.id,
        name: subject.name,
        assessmentType: subject.assessmentType,
        maxMarks: singleValue(subject.maxMarks),
        passMarks: singleValue(subject.passMarks),
        assessedStudents: subject.assessed,
        pendingStudents: subject.pending,
        passedStudents: subject.passed,
        failedStudents: subject.failed,
        absentStudents: subject.absent,
        exemptedStudents: subject.exempted,
        averagePercentage,
        highestPercentage: subject.percentages.length ? Math.max(...subject.percentages) : null,
        lowestPercentage: subject.percentages.length ? Math.min(...subject.percentages) : null,
        passRate: subject.assessed - subject.exempted > 0
          ? Number((subject.passed / (subject.assessed - subject.exempted) * 100).toFixed(2))
          : null,
      };
    }).sort((left, right) => left.name.localeCompare(right.name));

    return {
      exam,
      scope: { class: classRecord, section: sectionRecord, restricted: Boolean(assignments) },
      subjects,
      students,
      totals: {
        students: students.length,
        totalEntries,
        completedEntries,
        pendingEntries,
        passedEntries,
        failedEntries,
        passRate: passedEntries + failedEntries > 0
          ? Number((passedEntries / (passedEntries + failedEntries) * 100).toFixed(2))
          : null,
      },
    };
  },
};

function average(values: number[]) {
  return values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    : null;
}

function singleValue<T>(values: Set<T>) {
  return values.size === 1 ? [...values][0] : null;
}

function emptyTotals() {
  return {
    students: 0,
    totalEntries: 0,
    completedEntries: 0,
    pendingEntries: 0,
    passedEntries: 0,
    failedEntries: 0,
    passRate: null,
  };
}
