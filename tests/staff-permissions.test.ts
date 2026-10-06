import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

import {
  classifyApiRequestPath,
  hasModuleAccess,
  isModuleEnabledForSchool,
  moduleForRoute,
  normalizeStaffPermissions,
  permissionLevelFor,
  permissionModulesForRequestPath,
  permissionPolicyForRequest,
  requiredAccessLevel,
} from "../src/lib/staff-permissions.ts";
import { CONFIGURABLE_ROUTES } from "../src/lib/route-access.ts";

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

test("shared academic lookups are readable without granting academic writes", () => {
  const readPolicy = permissionPolicyForRequest(
    "/api/v1/classes/options",
    "demo",
    "GET",
  );
  assert.equal(readPolicy?.required, "VIEW");
  assert.ok(readPolicy?.modules.includes("FEES"));
  assert.ok(readPolicy?.modules.includes("ATTENDANCE"));

  const writePolicy = permissionPolicyForRequest(
    "/api/v1/classes",
    "demo",
    "POST",
  );
  assert.deepEqual(writePolicy, {
    modules: ["ACADEMICS"],
    required: "MANAGE",
    route: null,
  });
});

test("report exports remain available to report viewers", () => {
  assert.deepEqual(
    permissionPolicyForRequest("/api/v1/report-exports", "demo", "POST"),
    { modules: ["REPORTS"], required: "VIEW", route: null },
  );
});

test("school entitlements are applied to delegated API modules", () => {
  const school = {
    routeAccessRestricted: true,
    allowedRoutes: ["fees/collection"],
  };
  assert.equal(isModuleEnabledForSchool(school, "FEES"), true);
  assert.equal(isModuleEnabledForSchool(school, "TRANSPORT"), false);
});

test("every configurable page is delegated or explicitly protected", () => {
  const protectedRoutes = new Set([
    "teacher/dashboard",
    "schools/android-app",
    "users",
    "audit-logs",
    "system",
    "setup",
    "notification-inbox",
    "settings",
  ]);

  for (const route of CONFIGURABLE_ROUTES) {
    assert.ok(
      moduleForRoute(route) || protectedRoutes.has(route) || route.startsWith("bulk-operations/"),
      `Route ${route} must be delegated or explicitly protected`,
    );
  }
});

function apiRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? apiRouteFiles(path)
      : entry.name === "route.ts"
        ? [path]
        : [];
  });
}

test("every API route has an explicit access classification", () => {
  const root = "src/app/api/v1";
  for (const file of apiRouteFiles(root)) {
    const pathname = `/api/v1/${relative(root, file)}`
      .replaceAll("\\", "/")
      .replace(/\/route\.ts$/, "")
      .replace(/\[\.{3}[^\]]+\]/g, "value")
      .replace(/\[[^\]]+\]/g, "value");
    assert.notEqual(
      classifyApiRequestPath(pathname),
      "UNCLASSIFIED",
      `${pathname} needs an explicit API access classification`,
    );
  }
});
