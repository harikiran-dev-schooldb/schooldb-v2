import assert from "node:assert/strict";
import test from "node:test";

import {
  bulkAttendanceSchema,
  isStrictIsoDate,
  normalizeAdmissionNo,
} from "../src/features/attendance/schemas/bulk-attendance.schema.ts";

test("bulk attendance rejects impossible calendar dates", () => {
  assert.equal(isStrictIsoDate("2026-02-28"), true);
  assert.equal(isStrictIsoDate("2028-02-29"), true);
  assert.equal(isStrictIsoDate("2026-02-29"), false);
  assert.equal(isStrictIsoDate("2026-02-31"), false);
  assert.equal(isStrictIsoDate("2026-13-01"), false);
  assert.equal(isStrictIsoDate("2026-00-10"), false);

  assert.equal(
    bulkAttendanceSchema.safeParse({
      attendance: [{ admissionNo: "ADM001", date: "2026-02-31" }],
    }).success,
    false,
  );
});

test("bulk attendance normalizes admission numbers consistently", () => {
  assert.equal(normalizeAdmissionNo(" adm001 "), "ADM001");

  const parsed = bulkAttendanceSchema.parse({
    attendance: [{ admissionNo: " adm001 ", date: "2026-09-18" }],
  });
  assert.equal(parsed.attendance[0].admissionNo, "ADM001");
});

test("normalized admission numbers make case-only duplicate rows identical", () => {
  const rows = [
    { admissionNo: "adm001", date: "2026-09-18" },
    { admissionNo: "ADM001", date: "2026-09-18" },
  ];
  const keys = rows.map(
    (row) => `${normalizeAdmissionNo(row.admissionNo)}:${row.date}`,
  );
  assert.equal(new Set(keys).size, 1);
});

test("bulk attendance accepts historical dates when they are valid calendar dates", () => {
  const result = bulkAttendanceSchema.safeParse({
    attendance: [{ admissionNo: "ADM001", date: "2024-06-15" }],
  });
  assert.equal(result.success, true);
});
