import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreateStrategicWorkflow,
  canUpdateStrategicWorkflow,
} from "../src/features/strategic-workflows/access.ts";

const admin = { role: "SCHOOL_ADMIN", userId: "admin", customPermissionsEnabled: false, permissions: [] };
const teacher = { role: "TEACHER", userId: "teacher", customPermissionsEnabled: false, permissions: [] };
const receptionist = { role: "RECEPTIONIST", userId: "reception", customPermissionsEnabled: false, permissions: [] };
const manager = { role: "TEACHER", userId: "manager", customPermissionsEnabled: true, permissions: ["SUPPORT:MANAGE"] };
const outsider = { role: "TEACHER", userId: "outsider", customPermissionsEnabled: true, permissions: ["SUPPORT:VIEW"] };

const ordinary = { confidential: false, ownerUserId: "teacher", createdByUserId: "reception" };
const confidential = { ...ordinary, confidential: true };

test("only school administrators and SUPPORT managers can create a workflow", () => {
  assert.equal(canCreateStrategicWorkflow(admin), true);
  assert.equal(canCreateStrategicWorkflow(manager), true);
  assert.equal(canCreateStrategicWorkflow(teacher), false);
  assert.equal(canCreateStrategicWorkflow(receptionist), false);
  assert.equal(canCreateStrategicWorkflow(outsider), false);
});

test("owners and creators can update their workflow, unrelated viewers cannot", () => {
  assert.equal(canUpdateStrategicWorkflow(admin, ordinary), true);
  assert.equal(canUpdateStrategicWorkflow(teacher, ordinary), true);
  assert.equal(canUpdateStrategicWorkflow(receptionist, ordinary), true);
  assert.equal(canUpdateStrategicWorkflow(outsider, ordinary), false);
});

test("SUPPORT managers can update ordinary cases but not unrelated confidential cases", () => {
  assert.equal(canUpdateStrategicWorkflow(manager, ordinary), true);
  assert.equal(canUpdateStrategicWorkflow(manager, confidential), false);
  assert.equal(canUpdateStrategicWorkflow(teacher, confidential), true);
  assert.equal(canUpdateStrategicWorkflow(receptionist, confidential), true);
  assert.equal(canUpdateStrategicWorkflow(outsider, confidential), false);
  assert.equal(canUpdateStrategicWorkflow(admin, confidential), true);
});
