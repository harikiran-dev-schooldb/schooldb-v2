import assert from "node:assert/strict";
import test from "node:test";

import {
  isKotakSupportSchool,
  isSupportBulkOperationHref,
  isSupportNavigationHref,
  usesSupportNavigation,
} from "../src/lib/support-workspace.ts";

test("the Kotak super admin gets the support-focused navigation", () => {
  assert.equal(usesSupportNavigation("kotak", "SUPER_ADMIN"), true);
  assert.equal(usesSupportNavigation("kotak-vsp", "SUPER_ADMIN"), true);
  assert.equal(usesSupportNavigation("kotak", "SCHOOL_ADMIN"), false);
  assert.equal(usesSupportNavigation("another-school", "SUPER_ADMIN"), false);
  assert.equal(isKotakSupportSchool("KOTAK"), true);
});

test("support navigation contains only the requested operational routes", () => {
  for (const href of [
    "students",
    "teachers",
    "users",
    "classes",
    "sections",
    "queries",
    "parent-queries",
    "bulk-operations",
  ]) {
    assert.equal(isSupportNavigationHref(href), true, href);
  }

  for (const href of ["dashboard", "fees/dashboard", "reports", "settings"]) {
    assert.equal(isSupportNavigationHref(href), false, href);
  }
});

test("support bulk operations are limited to students, teachers, and classes", () => {
  for (const href of [
    "bulk-operations/students",
    "bulk-operations/teachers",
    "bulk-operations/classes",
  ]) {
    assert.equal(isSupportBulkOperationHref(href), true, href);
  }

  for (const href of [
    "bulk-operations/fees",
    "bulk-operations/subjects",
    "bulk-operations/student-logins",
  ]) {
    assert.equal(isSupportBulkOperationHref(href), false, href);
  }
});
