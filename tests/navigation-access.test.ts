import assert from "node:assert/strict";
import test from "node:test";

import {
  isMemberRouteAllowed,
  isMemberSchoolPathAllowed,
} from "../src/lib/navigation-access.ts";
import { BULK_OPERATION_ROUTES } from "../src/lib/route-access.ts";

const schoolAdmin = {
  role: "SCHOOL_ADMIN",
  customPermissionsEnabled: false,
  permissions: [],
};

test("registered bulk operations inherit the hub's administrator access", () => {
  const school = { routeAccessRestricted: false, allowedRoutes: [] };
  const superAdmin = { ...schoolAdmin, role: "SUPER_ADMIN" };
  const teacher = { ...schoolAdmin, role: "TEACHER" };
  const delegatedStaff = {
    role: "ACCOUNTANT",
    customPermissionsEnabled: true,
    permissions: ["INVENTORY:MANAGE", "FEES:MANAGE"],
  };

  for (const { href } of BULK_OPERATION_ROUTES) {
    const path = `/demo/${href}`;
    assert.equal(isMemberSchoolPathAllowed(school, schoolAdmin, path, "demo"), true, href);
    assert.equal(isMemberSchoolPathAllowed(school, superAdmin, path, "demo"), true, href);
    assert.equal(isMemberSchoolPathAllowed(school, teacher, path, "demo"), false, href);
    assert.equal(isMemberSchoolPathAllowed(school, delegatedStaff, path, "demo"), false, href);
  }

  assert.equal(isMemberRouteAllowed(schoolAdmin, "bulk-operations/unregistered"), false);
});

test("restricted schools authorize each bulk operation separately", () => {
  const school = {
    routeAccessRestricted: true,
    allowedRoutes: ["bulk-operations/students"],
  };
  const allowed = (path: string) => isMemberSchoolPathAllowed(school, schoolAdmin, path, "demo");

  assert.equal(allowed("/demo/bulk-operations"), true);
  assert.equal(allowed("/demo/bulk-operations/students"), true);
  assert.equal(allowed("/demo/bulk-operations/marks"), false);
});
