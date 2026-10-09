import assert from "node:assert/strict";
import test from "node:test";

import { createStudentComprehensiveWorkbook } from "../src/features/students/services/student-comprehensive-export.service.ts";

test("creates a premium multi-sheet student workbook", async () => {
  const sectionNames = [
    "Overview",
    "All Details",
    "Enrollment",
    "Attendance",
    "Fees",
    "Results",
    "Documents",
    "Activity",
    "Parents",
  ];
  const workbook = createStudentComprehensiveWorkbook({
    schoolName: "Sample School",
    studentName: "Sample Student",
    admissionNo: "STD-001",
    generatedAt: "2026-10-09T10:00:00.000Z",
    sections: sectionNames.map((title, index) => ({
      key: title.toLowerCase().replaceAll(" ", "-"),
      title,
      columns: ["Status", "Value"],
      rows: [{ Status: index % 2 ? "PENDING" : "ACTIVE", Value: index + 1 }],
    })),
  }, "Report Administrator");

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), sectionNames);
  for (const sheet of workbook.worksheets) {
    assert.equal(sheet.views[0]?.showGridLines, false);
    assert.equal(sheet.getCell("A1").value, "SAMPLE SCHOOL");
    assert.equal(sheet.getCell("A3").value, sheet.name.toUpperCase());
    assert.equal(sheet.getCell("A7").value, "Status");
    assert.equal(sheet.getCell("A1").fill.type, "pattern");
    assert.ok(sheet.properties.tabColor?.argb);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 5_000);
});
