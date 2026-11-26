import assert from "node:assert/strict";
import test from "node:test";

import {
  isMemberRouteAllowed,
  isMemberSchoolPathAllowed,
} from "../src/lib/navigation-access.ts";
import {
  hasModuleAccess,
  permissionPolicyForRequest,
} from "../src/lib/staff-permissions.ts";

const school = {
  routeAccessRestricted: true,
  moduleAccessRestricted: true,
  allowedRoutes: ["admissions", "academic-year", "classes", "sections", "users"],
};

const membership = (role: string, permissions: string[] = []) => ({
  role,
  customPermissionsEnabled: permissions.length > 0,
  permissions,
});

test("admissions workspace follows the complete role matrix", () => {
  for (const role of ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]) {
    assert.equal(
      isMemberSchoolPathAllowed(school, membership(role), "/kotak/admissions/pipeline", "kotak"),
      true,
      role,
    );
  }

  for (const role of ["TEACHER", "PARENT", "STUDENT"]) {
    assert.equal(
      isMemberSchoolPathAllowed(school, membership(role), "/kotak/admissions/pipeline", "kotak"),
      false,
      role,
    );
  }
});

test("a teacher needs an explicit admissions delegation", () => {
  const viewer = membership("TEACHER", ["ADMISSIONS:VIEW"]);
  const manager = membership("TEACHER", ["ADMISSIONS:MANAGE"]);

  assert.equal(isMemberRouteAllowed(viewer, "admissions"), true);
  assert.equal(hasModuleAccess(viewer, "ADMISSIONS", "VIEW"), true);
  assert.equal(hasModuleAccess(viewer, "ADMISSIONS", "MANAGE"), false);
  assert.equal(hasModuleAccess(manager, "ADMISSIONS", "MANAGE"), true);
});

test("admissions APIs require view for reads and manage for changes", () => {
  assert.deepEqual(permissionPolicyForRequest("/api/v1/admissions/intake", "kotak", "GET"), {
    modules: ["ADMISSIONS"],
    required: "VIEW",
    route: null,
  });
  assert.deepEqual(permissionPolicyForRequest("/api/v1/admissions/intake", "kotak", "POST"), {
    modules: ["ADMISSIONS"],
    required: "MANAGE",
    route: null,
  });
});
