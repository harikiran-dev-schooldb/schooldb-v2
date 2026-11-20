import assert from "node:assert/strict";
import test from "node:test";

import { createFollowUpSchema, schoolWeek, updateFollowUpSchema } from "../src/features/student-follow-ups/student-follow-up.ts";
import { isMemberRouteAllowed } from "../src/lib/navigation-access.ts";
import { isTeacherRouteAllowed } from "../src/lib/teacher-access.ts";

test("weekly follow-ups use Monday to Sunday in the school time zone", () => {
  const justBeforeMonday = schoolWeek(new Date("2026-11-15T18:29:59.999Z"));
  const mondayInIndia = schoolWeek(new Date("2026-11-15T18:30:00.000Z"));

  assert.equal(justBeforeMonday.gte.toISOString(), "2026-11-09T00:00:00.000Z");
  assert.equal(justBeforeMonday.lt.toISOString(), "2026-11-16T00:00:00.000Z");
  assert.equal(mondayInIndia.gte.toISOString(), "2026-11-16T00:00:00.000Z");
  assert.equal(mondayInIndia.lt.toISOString(), "2026-11-23T00:00:00.000Z");
});

test("follow-up inputs reject impossible dates and empty or unauthorized field updates", () => {
  const input = { studentId: "student", source: "LOW_ATTENDANCE", teacherId: "teacher", nextAction: "Review absence", dueDate: "2026-02-30" };
  assert.equal(createFollowUpSchema.safeParse(input).success, false);
  assert.equal(createFollowUpSchema.safeParse({ ...input, dueDate: "2026-02-28" }).success, true);
  assert.equal(updateFollowUpSchema.safeParse({}).success, false);
  assert.equal(updateFollowUpSchema.safeParse({ status: "COMPLETED", schoolId: "other" }).success, false);
});

test("follow-up updates accept intervention outcomes and bounded escalation", () => {
  assert.equal(updateFollowUpSchema.safeParse({
    status: "COMPLETED",
    parentContacted: true,
    escalationLevel: 2,
    outcome: "IMPROVED",
    closureNotes: "Parent meeting completed and the reassessment improved.",
  }).success, true);
  assert.equal(updateFollowUpSchema.safeParse({ escalationLevel: 4 }).success, false);
  assert.equal(updateFollowUpSchema.safeParse({ outcome: "UNKNOWN" }).success, false);
});

test("only school admins and teachers can open follow-ups, and teachers need results or attendance access", () => {
  const route = "student-follow-ups";
  const roles = { customPermissionsEnabled: true, permissions: ["LEARNING:MANAGE"] };
  assert.equal(isMemberRouteAllowed({ role: "ACCOUNTANT", ...roles }, route), false);
  assert.equal(isMemberRouteAllowed({ role: "TEACHER", ...roles }, route), true);

  const access = {
    studentDetailsAccess: false, feeAccess: false, resultAccess: false, timetableAccess: false,
    attendanceAccess: false, homeworkAccess: false, examAccess: false, marksEntryAccess: false,
  };
  assert.equal(isTeacherRouteAllowed(access, route), false);
  assert.equal(isTeacherRouteAllowed({ ...access, resultAccess: true }, route), true);
  assert.equal(isTeacherRouteAllowed({ ...access, attendanceAccess: true }, route), true);
});
