import assert from "node:assert/strict";
import test from "node:test";

import {
  isPublicPath,
  requireSchoolSlug,
  schoolSlugFromPath,
  schoolSlugFromSameOriginReferer,
} from "../src/lib/tenant-context.ts";
import {
  isOperationalRole,
  isSelfServiceRole,
  isStudentIdAccessible,
} from "../src/lib/access-control.ts";

test("extracts only valid school slugs from application paths", () => {
  assert.equal(schoolSlugFromPath("/green-valley/dashboard"), "green-valley");
  assert.equal(schoolSlugFromPath("/api/v1/students"), null);
  assert.equal(schoolSlugFromPath("/onboarding"), null);
  assert.equal(schoolSlugFromPath("/Green-Valley/dashboard"), null);
});

test("keeps the public route allowlist narrow", () => {
  assert.equal(isPublicPath("/"), true);
  assert.equal(isPublicPath("/login/SignIn_clerk_catchall_check_123"), true);
  assert.equal(isPublicPath("/green-valley/login"), true);
  assert.equal(isPublicPath("/green-valley/apply"), true);
  assert.equal(isPublicPath("/api/health"), true);
  assert.equal(isPublicPath("/api/health/database"), false);
  assert.equal(isPublicPath("/api/cron/whatsapp"), true);
  assert.equal(isPublicPath("/api/cron/not-a-real-route"), false);
  assert.equal(isPublicPath("/api/v1/public/whatsapp/webhook"), true);
  assert.equal(
    isPublicPath("/api/v1/public/payments/cashfree/webhook"),
    true,
  );
  assert.equal(
    isPublicPath("/api/v1/public/payments/cashfree/not-a-real-route"),
    false,
  );
  assert.equal(
    isPublicPath("/api/v1/public/payments/cashfree/orders/SDB-1/verify"),
    true,
  );
  assert.equal(isPublicPath("/pay/cashfree/SDB-1/secure-token"), true);
  assert.equal(
    isPublicPath("/pay/cashfree/SDB-1/secure-token/complete"),
    true,
  );
  assert.equal(isPublicPath("/pay/cashfree/SDB-1"), false);
  assert.equal(isPublicPath("/api/v1/public/whatsapp/not-a-real-route"), false);
  assert.equal(isPublicPath("/api/v1/public/auth/send-otp"), true);
  assert.equal(isPublicPath("/api/v1/public/auth/verify-otp"), true);
  assert.equal(isPublicPath("/api/v1/public/auth/not-a-real-route"), false);
  assert.equal(isPublicPath("/api/v1/public/admissions/green-valley"), true);
  assert.equal(
    isPublicPath("/api/v1/public/admissions/green-valley/track"),
    true,
  );
  assert.equal(
    isPublicPath("/api/v1/public/admissions/green-valley/documents"),
    true,
  );
  assert.equal(
    isPublicPath("/api/v1/public/admissions/green-valley/private"),
    false,
  );
  assert.equal(isPublicPath("/onboarding"), false);
  assert.equal(isPublicPath("/api/v1/students"), false);
  assert.equal(isPublicPath("/green-valley/dashboard"), false);
  assert.equal(schoolSlugFromPath("/pay/cashfree/SDB-1/token"), null);
});

test("accepts a tenant referer only when it is same-origin", () => {
  assert.equal(
    schoolSlugFromSameOriginReferer(
      "https://schooldb.test/green-valley/students",
      "https://schooldb.test",
    ),
    "green-valley",
  );
  assert.equal(
    schoolSlugFromSameOriginReferer(
      "https://attacker.test/green-valley/students",
      "https://schooldb.test",
    ),
    null,
  );
});

test("requires an explicit, normalized tenant context", () => {
  assert.equal(requireSchoolSlug("green-valley"), "green-valley");
  assert.throws(() => requireSchoolSlug(undefined), /required/);
  assert.throws(() => requireSchoolSlug("../green-valley"), /Invalid/);
  assert.throws(() => requireSchoolSlug("api"), /Invalid/);
});

test("keeps unscoped parent and student roles out of the operations workspace", () => {
  assert.equal(isOperationalRole("SUPER_ADMIN"), true);
  assert.equal(isOperationalRole("TEACHER"), true);
  assert.equal(isOperationalRole("ACCOUNTANT"), true);
  assert.equal(isOperationalRole("RECEPTIONIST"), true);
  assert.equal(isOperationalRole("PARENT"), false);
  assert.equal(isOperationalRole("STUDENT"), false);
});

test("allows only parent and student roles into self-service routes", () => {
  assert.equal(isSelfServiceRole("PARENT"), true);
  assert.equal(isSelfServiceRole("STUDENT"), true);
  assert.equal(isSelfServiceRole("TEACHER"), false);
  assert.equal(isSelfServiceRole("SCHOOL_ADMIN"), false);
});

test("student routes reject IDs outside the authenticated account scope", () => {
  const linkedStudents = [{ id: "student-a" }, { id: "student-b" }];

  assert.equal(isStudentIdAccessible(linkedStudents, "student-a"), true);
  assert.equal(isStudentIdAccessible(linkedStudents, "student-c"), false);
});
