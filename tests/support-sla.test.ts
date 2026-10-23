import assert from "node:assert/strict";
import test from "node:test";
import { supportSla } from "../src/lib/support-sla.ts";

test("urgent support tickets become response-overdue after four hours", () => {
  const createdAt = new Date("2026-10-23T00:00:00.000Z");
  const result = supportSla(
    { createdAt, priority: "URGENT", status: "OPEN" },
    new Date("2026-10-23T04:01:00.000Z"),
  );
  assert.equal(result.responseState, "OVERDUE");
  assert.equal(result.resolutionState, "DUE");
});

test("resolved tickets record whether the resolution SLA was met", () => {
  const createdAt = new Date("2026-10-20T00:00:00.000Z");
  const result = supportSla({
    createdAt,
    priority: "NORMAL",
    status: "RESOLVED",
    resolvedAt: new Date("2026-10-22T00:00:00.000Z"),
  });
  assert.equal(result.resolutionState, "MET");
});
