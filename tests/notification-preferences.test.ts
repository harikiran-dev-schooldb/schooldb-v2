import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultNotificationPreferences,
  notificationEnabled,
  notificationPreferenceField,
} from "../src/features/notifications/preferences.ts";

test("maps notification categories to user preferences", () => {
  assert.equal(notificationPreferenceField("HOMEWORK"), "homework");
  assert.equal(notificationPreferenceField("ATTENDANCE_ABSENT"), "attendance");
  assert.equal(notificationPreferenceField("FEE_PAYMENT"), "fees");
  assert.equal(notificationPreferenceField("EXAM_RESULT"), "exams");
  assert.equal(notificationPreferenceField("LEAVE_DECISION"), "leaveUpdates");
  assert.equal(notificationPreferenceField("GENERAL"), "announcements");
});

test("honors category and urgent notification preferences", () => {
  const preferences = { ...defaultNotificationPreferences, homework: false, urgent: false };
  assert.equal(notificationEnabled(preferences, "HOMEWORK", "NORMAL"), false);
  assert.equal(notificationEnabled(preferences, "GENERAL", "NORMAL"), true);
  assert.equal(notificationEnabled(preferences, "GENERAL", "URGENT"), false);
  assert.equal(notificationEnabled(undefined, "HOMEWORK", "NORMAL"), true);
});
