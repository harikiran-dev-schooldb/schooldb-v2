import assert from "node:assert/strict";
import test from "node:test";

import {
  compareStudentsByRollNumber,
  isLowAttendance,
} from "../src/features/attendance/services/attendance-threshold.ts";

test("does not treat a student with no attendance data as 0% attendance", () => {
  assert.equal(
    isLowAttendance({ total: 0, attendancePercentage: 0 }, 75),
    false,
  );
});

test("includes a student genuinely below the threshold", () => {
  assert.equal(
    isLowAttendance({ total: 4, attendancePercentage: 50 }, 75),
    true,
  );
});

test("does not include a student exactly at the threshold", () => {
  assert.equal(
    isLowAttendance({ total: 4, attendancePercentage: 75 }, 75),
    false,
  );
});

test("orders low-attendance students by roll number", () => {
  const students = [
    { rollNo: 10, fullName: "Tenth Student" },
    { rollNo: null, fullName: "No Roll Number" },
    { rollNo: 2, fullName: "Second Student" },
    { rollNo: 1, fullName: "First Student" },
  ];

  students.sort(compareStudentsByRollNumber);

  assert.deepEqual(
    students.map((student) => student.rollNo),
    [1, 2, 10, null],
  );
});
