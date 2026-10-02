import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSchoolDate,
  formatSchoolDateTime,
  SCHOOL_TIME_ZONE,
} from "../src/lib/date-time.ts";

test("formats production timestamps in India Standard Time", () => {
  const utc = new Date("2026-10-02T10:56:45.000Z");

  assert.equal(SCHOOL_TIME_ZONE, "Asia/Kolkata");
  assert.equal(formatSchoolDateTime(utc), "2/10/2026, 4:26:45 pm");
  assert.equal(formatSchoolDate(utc), "2/10/2026");
});
