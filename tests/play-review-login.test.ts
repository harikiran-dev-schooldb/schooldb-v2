import assert from "node:assert/strict";
import test from "node:test";

import { playReviewOtpFor } from "../src/features/auth/play-review-login.ts";

test("uses the fixed OTP only for the Google Play review phone", () => {
  assert.equal(playReviewOtpFor("demo", "9999999999"), "123456");
  assert.equal(playReviewOtpFor("another-school", "9999999999"), "123456");
  assert.equal(playReviewOtpFor("demo", "9999999998"), null);
});
