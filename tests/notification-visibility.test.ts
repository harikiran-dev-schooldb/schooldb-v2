import assert from "node:assert/strict";
import test from "node:test";

import { notificationVisibility } from "../src/features/notifications/visibility.ts";

test("limits notifications to the school and accessible student scopes", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const where = notificationVisibility(
    "school-1",
    [
      {
        id: "student-1",
        enrollments: [{ classId: "class-10", sectionId: "section-c" }],
      },
    ],
    now,
  );

  assert.deepEqual(where, {
    schoolId: "school-1",
    archived: false,
    publishedAt: { lte: now },
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      {
        OR: [
          { targetType: "SCHOOL", targetId: null },
          { targetType: "STUDENT", targetId: { in: ["student-1"] } },
          { targetType: "CLASS", targetId: { in: ["class-10"] } },
          { targetType: "SECTION", targetId: { in: ["section-c"] } },
        ],
      },
    ],
  });
});
