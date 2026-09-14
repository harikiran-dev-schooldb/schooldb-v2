import assert from "node:assert/strict";
import test from "node:test";

import { playReviewOtpFor } from "../src/features/auth/play-review-login.ts";

test("uses the fixed OTP only for the Google Play review tenant and phone", () => {
  assert.equal(playReviewOtpFor("testing", "9999999999"), "123456");
  assert.equal(playReviewOtpFor("testing", "9999999998"), null);
  assert.equal(playReviewOtpFor("another-school", "9999999999"), null);
  assert.equal(playReviewOtpFor("Testing", "9999999999"), null);
});
