import assert from "node:assert/strict";
import test from "node:test";

import {
  isRouteAllowed,
  isSchoolPathAllowed,
  normalizeAllowedRoutes,
} from "../src/lib/route-access.ts";

test("unrestricted schools retain all routes", () => {
  const config = { routeAccessRestricted: false, allowedRoutes: [] };
  assert.equal(isRouteAllowed(config, "dashboard"), true);
  assert.equal(isRouteAllowed(config, "bulk-operations/fees"), true);
});

test("restricted schools expose only selected routes", () => {
  const config = {
    routeAccessRestricted: true,
    allowedRoutes: ["students", "queries", "bulk-operations/students"],
  };

  assert.equal(isRouteAllowed(config, "students"), true);
  assert.equal(isRouteAllowed(config, "queries"), true);
  assert.equal(isRouteAllowed(config, "fees/dashboard"), false);
  assert.equal(isRouteAllowed(config, "notification-inbox"), false);
  assert.equal(isRouteAllowed(config, "bulk-operations"), true);
  assert.equal(isRouteAllowed(config, "bulk-operations/students"), true);
  assert.equal(isRouteAllowed(config, "bulk-operations/fees"), false);
});

test("super admin school-management routes cannot be hidden", () => {
  const config = { routeAccessRestricted: true, allowedRoutes: [] };
  assert.equal(isRouteAllowed(config, "schools"), true);
  assert.equal(isRouteAllowed(config, "schools/route-access"), true);
});

test("the user guide remains available for every member", () => {
  const config = { routeAccessRestricted: true, allowedRoutes: [] };
  assert.equal(isRouteAllowed(config, "user-guide"), true);
  assert.equal(
    isSchoolPathAllowed(config, "/demo/user-guide", "demo", "TEACHER"),
    true,
  );
});

test("saved route lists are deduplicated and reject unknown routes", () => {
  assert.deepEqual(
    normalizeAllowedRoutes(["students", "students", "not-a-route", 12]),
    ["students"],
  );
});

test("restricted page URLs require an assigned route", () => {
  const config = {
    routeAccessRestricted: true,
    allowedRoutes: ["students", "bulk-operations/students"],
  };

  assert.equal(
    isSchoolPathAllowed(config, "/demo/students/123", "demo", "SCHOOL_ADMIN"),
    true,
  );
  assert.equal(
    isSchoolPathAllowed(config, "/demo/fees/dashboard", "demo", "SCHOOL_ADMIN"),
    false,
  );
  assert.equal(
    isSchoolPathAllowed(
      config,
      "/demo/bulk-operations/students",
      "demo",
      "SCHOOL_ADMIN",
    ),
    true,
  );
  assert.equal(
    isSchoolPathAllowed(
      config,
      "/demo/schools/route-access",
      "demo",
      "SUPER_ADMIN",
    ),
    true,
  );
  assert.equal(
    isSchoolPathAllowed(
      config,
      "/demo/schools/route-access",
      "demo",
      "SCHOOL_ADMIN",
    ),
    false,
  );
});

test("new school operations routes can be granted independently", () => {
  const config = {
    routeAccessRestricted: true,
    allowedRoutes: ["staff-operations", "inventory", "management-analytics"],
  };

  assert.equal(isSchoolPathAllowed(config, "/demo/staff-operations", "demo", "SCHOOL_ADMIN"), true);
  assert.equal(isSchoolPathAllowed(config, "/demo/staff-operations/payslips/entry-1", "demo", "SCHOOL_ADMIN"), true);
  assert.equal(isSchoolPathAllowed(config, "/demo/inventory", "demo", "SCHOOL_ADMIN"), true);
  assert.equal(isSchoolPathAllowed(config, "/demo/visitors", "demo", "SCHOOL_ADMIN"), false);
});
