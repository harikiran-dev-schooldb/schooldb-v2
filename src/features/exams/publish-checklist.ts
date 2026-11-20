import { isAssessmentEntryMissing, type AssessmentEntry, type ExamAssessmentType } from "./assessment.ts";

type ChecklistSchedule = {
  id: string;
  classId: string;
  class: { name: string };
  sectionId: string | null;
  subject: { name: string };
  assessmentType: ExamAssessmentType;
};

type ChecklistMark = AssessmentEntry & {
  examScheduleId: string;
};

type ChecklistEnrollment = {
  id: string;
  classId: string;
  sectionId: string;
  section: { name: string };
  examMarks: ChecklistMark[];
};

export type PublishChecklistGroup = {
  scheduleId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  assessmentType: ExamAssessmentType;
  expectedCount: number;
  missingCount: number;
};

export type PublishChecklistSummary = {
  scheduleCount: number;
  expectedCount: number;
  missingCount: number;
  groups: PublishChecklistGroup[];
};

export type PublishChecklist = PublishChecklistSummary & { reviewKey: string };

export function canOverrideExamPublish(role: string) {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function requiresPublishOverride(checklist: PublishChecklistSummary) {
  return checklist.expectedCount === 0 || checklist.missingCount > 0;
}

export function summarizePublishChecklist(
  schedules: ChecklistSchedule[],
  enrollments: ChecklistEnrollment[],
) {
  const schedulesByClass = Map.groupBy(schedules, (schedule) => schedule.classId);
  const groups = new Map<string, PublishChecklistGroup>();
  const missingEntries: string[] = [];
  let expectedCount = 0;
  let missingCount = 0;

  for (const enrollment of enrollments) {
    const marks = new Map(enrollment.examMarks.map((mark) => [mark.examScheduleId, mark]));
    for (const schedule of schedulesByClass.get(enrollment.classId) ?? []) {
      if (schedule.sectionId !== null && schedule.sectionId !== enrollment.sectionId) continue;

      const key = `${schedule.id}:${enrollment.sectionId}`;
      const group = groups.get(key) ?? {
        scheduleId: schedule.id,
        sectionId: enrollment.sectionId,
        className: schedule.class.name,
        sectionName: enrollment.section.name,
        subjectName: schedule.subject.name,
        assessmentType: schedule.assessmentType,
        expectedCount: 0,
        missingCount: 0,
      };
      group.expectedCount += 1;
      expectedCount += 1;
      if (isAssessmentEntryMissing(schedule.assessmentType, marks.get(schedule.id))) {
        group.missingCount += 1;
        missingCount += 1;
        missingEntries.push(JSON.stringify([schedule.id, enrollment.id]));
      }
      groups.set(key, group);
    }
  }

  const summary: PublishChecklistSummary = {
    scheduleCount: schedules.length,
    expectedCount,
    missingCount,
    groups: [...groups.values()].filter((group) => group.missingCount > 0).sort((a, b) =>
      a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName) ||
      a.subjectName.localeCompare(b.subjectName) || a.scheduleId.localeCompare(b.scheduleId) ||
      a.sectionId.localeCompare(b.sectionId),
    ),
  };
  return { summary, missingEntries: missingEntries.sort() };
}
