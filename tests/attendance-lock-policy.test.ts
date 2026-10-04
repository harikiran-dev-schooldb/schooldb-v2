import assert from "node:assert/strict";
import test from "node:test";

import { canUnlockAttendance } from "../src/features/attendance/policy.ts";

test("only super administrators and principals can unlock attendance", () => {
  assert.equal(canUnlockAttendance("SUPER_ADMIN", null), true);
  assert.equal(canUnlockAttendance("SCHOOL_ADMIN", "Principal"), true);
  assert.equal(canUnlockAttendance("SCHOOL_ADMIN", " principal "), true);
  assert.equal(canUnlockAttendance("SCHOOL_ADMIN", "School Administrator"), false);
  assert.equal(canUnlockAttendance("SCHOOL_ADMIN", "Vice Principal"), false);
  assert.equal(canUnlockAttendance("TEACHER", "Principal"), false);
});
