import assert from "node:assert/strict";
import test from "node:test";

import {
  hasModuleAccess,
  normalizeStaffPermissions,
  permissionLevelFor,
  permissionModulesForRequestPath,
  requiredAccessLevel,
} from "../src/lib/staff-permissions.ts";

test("normalizes module permissions and keeps the last level", () => {
  assert.deepEqual(
    normalizeStaffPermissions([
      "STUDENTS:VIEW",
      "STUDENTS:MANAGE",
      "FEES:VIEW",
      "USERS:MANAGE",
      "FEES:INVALID",
    ]),
    ["STUDENTS:MANAGE", "FEES:VIEW"],
  );
});

test("uses role presets until custom permissions are enabled", () => {
  const accountant = {
    role: "ACCOUNTANT",
    customPermissionsEnabled: false,
    permissions: [],
  };
  assert.equal(permissionLevelFor(accountant, "FEES"), "MANAGE");
  assert.equal(hasModuleAccess(accountant, "ATTENDANCE", "VIEW"), false);

  const custom = {
    ...accountant,
    customPermissionsEnabled: true,
    permissions: ["ATTENDANCE:VIEW"],
  };
  assert.equal(permissionLevelFor(custom, "FEES"), "NONE");
  assert.equal(hasModuleAccess(custom, "ATTENDANCE", "VIEW"), true);
  assert.equal(hasModuleAccess(custom, "ATTENDANCE", "MANAGE"), false);
});

test("maps pages and APIs to modules and access levels", () => {
  assert.deepEqual(
    permissionModulesForRequestPath("/demo/fees/collection", "demo"),
    ["FEES"],
  );
  assert.deepEqual(
    permissionModulesForRequestPath("/api/v1/transport", "demo"),
    ["TRANSPORT"],
  );
  assert.equal(requiredAccessLevel("GET"), "VIEW");
  assert.equal(requiredAccessLevel("POST"), "MANAGE");
});
