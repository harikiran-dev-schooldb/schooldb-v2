import assert from "node:assert/strict";
import test from "node:test";

import { rankAttendanceStudents } from "../src/features/attendance/services/attendance-ranking.ts";

const student = (
  fullName: string,
  attendancePercentage: number,
  total = 100,
) => ({
  fullName,
  attendancePercentage,
  total,
  present: Math.round((attendancePercentage / 100) * total),
  late: 0,
});

test("ranks attendance percentages and keeps tied students", () => {
  const result = rankAttendanceStudents(
    [
      student("Fourth", 92),
      student("First", 100),
      student("Joint second A", 95),
      student("Joint second B", 95),
    ],
    2,
  );

  assert.deepEqual(
    result.toppers.map(({ fullName, rank }) => ({ fullName, rank })),
    [
      { fullName: "First", rank: 1 },
      { fullName: "Joint second A", rank: 2 },
      { fullName: "Joint second B", rank: 2 },
    ],
  );
});

test("does not rank students without attendance records", () => {
  const result = rankAttendanceStudents(
    [student("No attendance", 0, 0), student("Recorded", 80)],
    10,
  );

  assert.equal(result.eligible.length, 1);
  assert.equal(result.toppers[0]?.fullName, "Recorded");
});
