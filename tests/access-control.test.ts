import assert from "node:assert/strict";
import test from "node:test";

import {
  isOperationalRole,
  isSelfServiceRole,
  isStudentIdAccessible,
} from "../src/lib/access-control.ts";

test("operational and self-service roles stay separated", () => {
  for (const role of ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"]) {
    assert.equal(isOperationalRole(role), true);
    assert.equal(isSelfServiceRole(role), false);
  }

  for (const role of ["STUDENT", "PARENT"]) {
    assert.equal(isOperationalRole(role), false);
    assert.equal(isSelfServiceRole(role), true);
  }
});

test("student access only accepts an explicitly linked student", () => {
  const students = [{ id: "student-1" }, { id: "student-2" }];
  assert.equal(isStudentIdAccessible(students, "student-2"), true);
  assert.equal(isStudentIdAccessible(students, "student-3"), false);
});
