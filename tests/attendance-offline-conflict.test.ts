import assert from "node:assert/strict";
import test from "node:test";

import { offlineAttendanceConflict } from "../src/features/attendance/offline-conflict.ts";

const updatedAt = new Date("2026-10-08T05:00:00.000Z");

test("accepts an unchanged offline attendance snapshot", () => {
  assert.equal(
    offlineAttendanceConflict(
      { id: "session-1", updatedAt, locked: false },
      { sessionId: "session-1", baseUpdatedAt: updatedAt.toISOString() },
    ),
    null,
  );
});

test("detects a register updated on another device", () => {
  assert.match(
    offlineAttendanceConflict(
      { id: "session-1", updatedAt, locked: false },
      { sessionId: "session-1", baseUpdatedAt: "2026-10-08T04:00:00.000Z" },
    ) ?? "",
    /updated on another device/i,
  );
});

test("detects a register created after an empty snapshot", () => {
  assert.match(
    offlineAttendanceConflict(
      { id: "session-1", updatedAt, locked: false },
      { sessionId: null, baseUpdatedAt: null },
    ) ?? "",
    /created on another device/i,
  );
});

test("allows a new register when none exists", () => {
  assert.equal(
    offlineAttendanceConflict(null, { sessionId: null, baseUpdatedAt: null }),
    null,
  );
});

test("allows retrying an empty unlocked register created by an interrupted sync", () => {
  assert.equal(
    offlineAttendanceConflict(
      { id: "session-1", updatedAt, locked: false, recordCount: 0 },
      { sessionId: null, baseUpdatedAt: null },
    ),
    null,
  );
});

test("rejects a locked register", () => {
  assert.match(
    offlineAttendanceConflict(
      { id: "session-1", updatedAt, locked: true },
      { sessionId: "session-1", baseUpdatedAt: updatedAt.toISOString() },
    ) ?? "",
    /already locked/i,
  );
});
