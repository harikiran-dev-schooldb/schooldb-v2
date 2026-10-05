import assert from "node:assert/strict";
import test from "node:test";

import {
  canManageStaffAccount,
  isStaffAccountRole,
  STAFF_ACCOUNT_ROLES,
} from "../src/features/users/staff-account-policy.ts";

test("staff account roles exclude self-service memberships", () => {
  assert.deepEqual(STAFF_ACCOUNT_ROLES, [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "TEACHER",
    "ACCOUNTANT",
    "RECEPTIONIST",
  ]);
  assert.equal(isStaffAccountRole("STUDENT"), false);
  assert.equal(isStaffAccountRole("PARENT"), false);
});

test("super administrators can manage staff except themselves and other super administrators", () => {
  const actor = { userId: "super-1", role: "SUPER_ADMIN" };

  assert.equal(
    canManageStaffAccount(actor, { userId: "admin-1", role: "SCHOOL_ADMIN" }),
    true,
  );
  assert.equal(
    canManageStaffAccount(actor, { userId: "super-1", role: "SUPER_ADMIN" }),
    false,
  );
  assert.equal(
    canManageStaffAccount(actor, { userId: "super-2", role: "SUPER_ADMIN" }),
    false,
  );
});

test("school administrators cannot manage administrator accounts", () => {
  const actor = { userId: "admin-1", role: "SCHOOL_ADMIN" };

  assert.equal(
    canManageStaffAccount(actor, { userId: "teacher-1", role: "TEACHER" }),
    true,
  );
  assert.equal(
    canManageStaffAccount(actor, { userId: "admin-2", role: "SCHOOL_ADMIN" }),
    false,
  );
  assert.equal(
    canManageStaffAccount(actor, { userId: "admin-1", role: "SCHOOL_ADMIN" }),
    false,
  );
});
