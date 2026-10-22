import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function runLoadTest(environment: Record<string, string>, dryRun = false) {
  return spawnSync(
    process.execPath,
    ["scripts/load-test.mjs", ...(dryRun ? ["--dry-run"] : [])],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        NODE_ENV: process.env.NODE_ENV ?? "test",
        PATH: process.env.PATH ?? "",
        ...environment,
      },
    },
  );
}

test("builds read-only plans for the main and support Android apps", () => {
  const admin = runLoadTest({
    LOAD_TEST_PROFILE: "admin-mobile",
    LOAD_TEST_BASE_URL: "https://staging.example.com",
  }, true);
  const support = runLoadTest({
    LOAD_TEST_PROFILE: "support-mobile",
    LOAD_TEST_BASE_URL: "https://staging.example.com",
  }, true);

  assert.equal(admin.status, 0, admin.stderr);
  assert.match(admin.stdout, /\/api\/v1\/mobile\/admin\/dashboard/);
  assert.match(admin.stdout, /Dry run complete; no requests were sent/);
  assert.equal(support.status, 0, support.stderr);
  assert.match(support.stdout, /\/api\/v1\/support\/tickets/);
  assert.match(support.stdout, /\/api\/v1\/support\/staff/);
});

test("refuses authenticated profiles without staging credentials", () => {
  const result = runLoadTest({
    LOAD_TEST_PROFILE: "teacher-mobile",
    LOAD_TEST_BASE_URL: "https://staging.example.com",
    LOAD_TEST_SCHOOL_SLUG: "demo-school",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /LOAD_TEST_COOKIE or LOAD_TEST_AUTH_TOKEN/);
});

test("locks the SchoolDB production domain by default", () => {
  const result = runLoadTest({
    LOAD_TEST_URL: "https://www.schooldb.co.in/api/health",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Production load testing is locked/);
});
