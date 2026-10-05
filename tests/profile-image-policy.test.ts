import assert from "node:assert/strict";
import test from "node:test";

import {
  canManageRosterProfileImages,
  canReviewStudentProfileImages,
  canSubmitOwnProfileImage,
} from "../src/features/settings/profile-image-policy.ts";

test("students submit their own image for approval", () => {
  assert.equal(canSubmitOwnProfileImage("STUDENT"), true);
  assert.equal(canReviewStudentProfileImages("STUDENT"), false);
});

test("school admins, principals, and super admins manage roster images", () => {
  assert.equal(canManageRosterProfileImages("SUPER_ADMIN"), true);
  assert.equal(canManageRosterProfileImages("SCHOOL_ADMIN"), true);
  assert.equal(canReviewStudentProfileImages("SCHOOL_ADMIN"), true);
  assert.equal(canSubmitOwnProfileImage("SCHOOL_ADMIN"), true);
});

test("teachers and receptionists cannot manage roster images", () => {
  assert.equal(canManageRosterProfileImages("TEACHER"), false);
  assert.equal(canManageRosterProfileImages("RECEPTIONIST"), false);
});
