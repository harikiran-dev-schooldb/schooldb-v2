import assert from "node:assert/strict";
import test from "node:test";

import {
  hasTeacherAccess,
  isTeacherRouteAllowed,
  type TeacherAccessSettings,
} from "../src/lib/teacher-access.ts";

const access: TeacherAccessSettings = {
  studentDetailsAccess: true,
  feeAccess: false,
  resultAccess: true,
  timetableAccess: true,
  attendanceAccess: false,
  homeworkAccess: true,
  examAccess: true,
  marksEntryAccess: false,
};

test("teacher module switches hide disabled workspace routes", () => {
  assert.equal(isTeacherRouteAllowed(access, "students"), true);
  assert.equal(isTeacherRouteAllowed(access, "fees/outstanding"), false);
  assert.equal(isTeacherRouteAllowed(access, "attendance/reports/class"), false);
  assert.equal(isTeacherRouteAllowed(access, "teacher/dashboard"), true);
});

test("teacher feature checks use the corresponding administrator switch", () => {
  assert.equal(hasTeacherAccess(access, "EXAMS"), true);
  assert.equal(hasTeacherAccess(access, "MARKS_ENTRY"), false);
  assert.equal(hasTeacherAccess(null, "STUDENTS"), false);
});
