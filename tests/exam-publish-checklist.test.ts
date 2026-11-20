import assert from "node:assert/strict";
import test from "node:test";

import {
  canOverrideExamPublish,
  requiresPublishOverride,
  summarizePublishChecklist,
} from "../src/features/exams/publish-checklist.ts";
import { updateExamSchema } from "../src/features/exams/schemas/exam.schema.ts";
import { getExamPublishChecklist } from "../src/features/exams/services/exam-publish-checklist.service.ts";

const schedules = [
  {
    id: "math-all",
    classId: "grade-six",
    class: { name: "Grade 6" },
    sectionId: null,
    subject: { name: "Math" },
    assessmentType: "MARKS",
  },
  {
    id: "english-a",
    classId: "grade-six",
    class: { name: "Grade 6" },
    sectionId: "section-a",
    subject: { name: "English" },
    assessmentType: "GRADE",
  },
] satisfies Parameters<typeof summarizePublishChecklist>[0];

type Enrollment = Parameters<typeof summarizePublishChecklist>[1][number];

function enrollment(id: string, section: "a" | "b", examMarks: Enrollment["examMarks"] = []): Enrollment {
  return {
    id,
    classId: "grade-six",
    sectionId: `section-${section}`,
    section: { name: section.toUpperCase() },
    examMarks,
  };
}

test("exam publish checklist groups missing marks and grades by their actual section", () => {
  const { summary } = summarizePublishChecklist(schedules, [
    enrollment("student-1", "a", [
      { examScheduleId: "math-all", status: "PRESENT", marksObtained: 0 },
      { examScheduleId: "english-a", status: "PRESENT", grade: " " },
    ]),
    enrollment("student-2", "a", [
      { examScheduleId: "math-all", status: "ABSENT", marksObtained: null },
      { examScheduleId: "english-a", status: "EXEMPTED", grade: null },
    ]),
    enrollment("student-3", "b", [
      { examScheduleId: "math-all", status: "PRESENT", marksObtained: null },
    ]),
    enrollment("student-4", "b"),
  ]);

  assert.equal(summary.scheduleCount, 2);
  assert.equal(summary.expectedCount, 6);
  assert.equal(summary.missingCount, 3);
  assert.deepEqual(summary.groups.map((group) => [
    group.scheduleId, group.sectionId, group.assessmentType, group.expectedCount, group.missingCount,
  ]), [
    ["english-a", "section-a", "GRADE", 2, 1],
    ["math-all", "section-b", "MARKS", 2, 2],
  ]);
  assert.equal(requiresPublishOverride(summary), true);
});

test("completed marks and grades pass review while empty scopes require an administrator override", () => {
  const complete = summarizePublishChecklist(schedules, [
    enrollment("student-1", "a", [
      { examScheduleId: "math-all", status: "PRESENT", marksObtained: 0 },
      { examScheduleId: "english-a", status: "PRESENT", grade: "A" },
    ]),
  ]).summary;

  assert.equal(requiresPublishOverride(complete), false);
  assert.deepEqual(complete.groups, []);
  assert.equal(requiresPublishOverride(summarizePublishChecklist(schedules, []).summary), true);
  assert.equal(canOverrideExamPublish("SCHOOL_ADMIN"), true);
  assert.equal(canOverrideExamPublish("SUPER_ADMIN"), true);
  assert.equal(canOverrideExamPublish("TEACHER"), false);
  assert.equal(updateExamSchema.safeParse({
    status: "COMPLETED",
    publishOverride: { reason: "   ", reviewKey: "a".repeat(64) },
  }).success, false);
});

test("a publish review key changes when different entries are missing, even with unchanged counts", async () => {
  const exam = { id: "exam-one", schoolId: "school-one", academicYearId: "year-one" };
  async function check(rows: Enrollment[]) {
    return getExamPublishChecklist({
      examSchedule: {
        findMany: async ({ where }: { where: unknown }) => {
          assert.deepEqual(where, { examId: exam.id, schoolId: exam.schoolId });
          return schedules;
        },
      },
      studentEnrollment: {
        findMany: async ({ where }: { where: { schoolId: string; academicYearId: string; active: boolean } }) => {
          assert.equal(where.schoolId, exam.schoolId);
          assert.equal(where.academicYearId, exam.academicYearId);
          assert.equal(where.active, true);
          return rows;
        },
      },
    } as unknown as Parameters<typeof getExamPublishChecklist>[0], exam);
  }

  const marked = (id: string) => enrollment(id, "b", [
    { examScheduleId: "math-all", status: "PRESENT", marksObtained: 10 },
  ]);
  const first = await check([enrollment("student-3", "b"), marked("student-4")]);
  const reordered = await check([marked("student-4"), enrollment("student-3", "b")]);
  const changed = await check([marked("student-3"), enrollment("student-4", "b")]);

  assert.deepEqual(first.groups, changed.groups);
  assert.equal(first.reviewKey, reordered.reviewKey);
  assert.notEqual(first.reviewKey, changed.reviewKey);
  assert.ok(!JSON.stringify(first).includes("student-3"));
});
