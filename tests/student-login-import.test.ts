import assert from "node:assert/strict";
import test from "node:test";

import { parseStudentLoginAdmissionNumbers } from "../src/features/students/student-login-import.ts";

test("reads admission numbers from the dedicated login template", () => {
  assert.deepEqual(
    parseStudentLoginAdmissionNumbers("admissionNo\nSTD001\nSTD002\nSTD001\n"),
    ["STD001", "STD002"],
  );
});

test("reads only the admission number column from a full student CSV", () => {
  assert.deepEqual(
    parseStudentLoginAdmissionNumbers(
      'fullName,admissionNo,phone\n"Student, One",A-001,9000000000\nStudent Two,A-002,',
    ),
    ["A-001", "A-002"],
  );
});

test("accepts pasted admission numbers separated by lines or commas", () => {
  assert.deepEqual(
    parseStudentLoginAdmissionNumbers("STD001, STD002\nSTD003"),
    ["STD001", "STD002", "STD003"],
  );
});
