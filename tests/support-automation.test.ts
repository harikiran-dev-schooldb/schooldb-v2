import assert from "node:assert/strict";
import test from "node:test";
import { parseSupportAutomation, supportAutomationSchema } from "../src/lib/support-automation.ts";

test("support automation defaults to manual routing and disabled escalation", () => {
  assert.deepEqual(parseSupportAutomation(null), {
    assignments: {}, escalationEnabled: false, escalationGraceHours: 0, escalationRecipientId: null,
  });
});

test("support automation accepts school category routes and a bounded grace period", () => {
  const config = supportAutomationSchema.parse({ assignments: { FEES: "staff-1", IT: "staff-2" }, escalationEnabled: true, escalationGraceHours: 12 });
  assert.equal(config.assignments.FEES, "staff-1");
  assert.equal(config.assignments.IT, "staff-2");
  assert.equal(config.escalationGraceHours, 12);
});

test("malformed persisted policy fails closed", () => {
  assert.equal(parseSupportAutomation({ escalationEnabled: true, escalationGraceHours: -1 }).escalationEnabled, false);
  assert.equal(supportAutomationSchema.safeParse({ escalationGraceHours: 169 }).success, false);
  assert.equal(supportAutomationSchema.safeParse({ assignments: { FEES: "" } }).success, false);
});
