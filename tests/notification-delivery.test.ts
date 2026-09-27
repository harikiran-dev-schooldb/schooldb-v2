import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "../src/features/notifications/batch.ts";
import { notificationDedupeKey } from "../src/features/notifications/dedupe.ts";

test("notification dedupe keys are stable and source-specific", () => {
  assert.equal(notificationDedupeKey.homeworkPublished("hw-1"), "HOMEWORK:hw-1:PUBLISHED");
  assert.equal(notificationDedupeKey.examResultsPublished("exam-1", "SECTION", "sec-a"), "EXAM:exam-1:RESULTS:SECTION:sec-a");
  assert.notEqual(notificationDedupeKey.attendanceAbsent("s1", "u1"), notificationDedupeKey.attendanceAbsent("s2", "u1"));
  assert.equal(notificationDedupeKey.feeReminder("u1", "2026-09-27"), "FEE_REMINDER:u1:2026-09-27");
});

test("bounded notification batching preserves order and concurrency", async () => {
  let active = 0, maxActive = 0;
  const result = await mapWithConcurrency([1,2,3,4,5], 2, async (value) => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--; return value * 10;
  });
  assert.deepEqual(result, [10,20,30,40,50]);
  assert.equal(maxActive, 2);
});

test("batch helper rejects invalid concurrency", async () => {
  await assert.rejects(() => mapWithConcurrency([1], 0, async (v) => v), /positive integer/);
});
