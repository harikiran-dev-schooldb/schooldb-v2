import assert from "node:assert/strict";
import test from "node:test";

import {
  assignedExamScheduleFilter,
  canViewExamSchedule,
  getExamTeacherAssignments,
} from "../src/features/exams/exam-teacher-scope.ts";

const mathAssignment = {
  academicYearId: "current",
  classId: "class-x",
  sectionId: "section-a",
  subjectId: "math",
};
const classAssignment = {
  academicYearId: "current",
  classId: "class-x",
  sectionId: "section-b",
};

test("failure reports use only assignments in the selected exam year, class and section", () => {
  const assignments = [
    mathAssignment,
    classAssignment,
    { ...mathAssignment, academicYearId: "previous" },
    { ...classAssignment, classId: "class-y" },
  ];

  assert.deepEqual(getExamTeacherAssignments(assignments, "current", "class-x"), [mathAssignment, classAssignment]);
  assert.deepEqual(getExamTeacherAssignments(assignments, "current", "class-x", "section-b"), [classAssignment]);
  assert.deepEqual(getExamTeacherAssignments(assignments, "current", "class-x", "section-c"), []);
});

test("class-wide schedules still keep subject and section access separate for each enrollment", () => {
  assert.deepEqual(assignedExamScheduleFilter(mathAssignment), {
    classId: "class-x",
    OR: [{ sectionId: "section-a" }, { sectionId: null }],
    subjectId: "math",
  });

  const assignments = [mathAssignment, classAssignment];
  assert.equal(canViewExamSchedule(assignments, "section-a", "math"), true);
  assert.equal(canViewExamSchedule(assignments, "section-a", "english"), false);
  assert.equal(canViewExamSchedule(assignments, "section-b", "english"), true);
  assert.equal(canViewExamSchedule(assignments, "section-c", "math"), false);
});
