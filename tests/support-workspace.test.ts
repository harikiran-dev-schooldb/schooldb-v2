import assert from "node:assert/strict";
import test from "node:test";
import { personalSupportFilters, unresolvedSupport } from "../src/lib/support-workspace.ts";

test("personal queues scope assignments and raised requests to the current user", () => {
  const now = new Date("2026-11-26T12:00:00Z");
  const filters = personalSupportFilters("staff-1", now);
  assert.deepEqual(filters.assigned, { ...unresolvedSupport, assignedToId: "staff-1" });
  assert.deepEqual(filters.raised, { ...unresolvedSupport, createdById: "staff-1" });
  assert.equal(filters.overdue.assignedToId, "staff-1");
  assert.deepEqual(unresolvedSupport.status, { notIn: ["RESOLVED", "CLOSED"] });
  assert.deepEqual(filters.overdue.OR?.[0], {
    priority: "URGENT", createdAt: { lt: new Date("2026-11-25T12:00:00Z") },
  });
});
