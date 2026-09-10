import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission, PERMISSIONS } from "../src/lib/access-control.ts";

test("limits private student data to administrators and reception", () => {
  assert.equal(hasPermission("SCHOOL_ADMIN", PERMISSIONS.STUDENT_PRIVATE_READ), true);
  assert.equal(hasPermission("RECEPTIONIST", PERMISSIONS.STUDENT_PRIVATE_READ), true);
  assert.equal(hasPermission("TEACHER", PERMISSIONS.STUDENT_PRIVATE_READ), false);
  assert.equal(hasPermission("ACCOUNTANT", PERMISSIONS.STUDENT_PRIVATE_READ), false);
});

test("separates finance and attendance permissions", () => {
  assert.equal(hasPermission("ACCOUNTANT", PERMISSIONS.FEE_READ), true);
  assert.equal(hasPermission("ACCOUNTANT", PERMISSIONS.ATTENDANCE_READ), false);
  assert.equal(hasPermission("TEACHER", PERMISSIONS.ATTENDANCE_READ), true);
  assert.equal(hasPermission("TEACHER", PERMISSIONS.FEE_READ), false);
});
