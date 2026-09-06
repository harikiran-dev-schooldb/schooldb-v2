import assert from "node:assert/strict";
import test from "node:test";

import { availableForAcademicYear } from "../src/features/student-enrollments/enrollment-rules.ts";
import { studentEnrollmentSchema } from "../src/features/student-enrollments/schemas/student-enrollment.schema.ts";

const validEnrollment = {
  studentId: "student-1",
  academicYearId: "year-1",
  classId: "class-1",
  sectionId: "section-1",
  rollNo: 1,
  active: true,
};

test("excludes students with any enrollment in the selected academic year", () => {
  assert.deepEqual(availableForAcademicYear("year-1"), {
    none: { academicYearId: "year-1" },
  });

  assert.deepEqual(availableForAcademicYear("year-1", "enrollment-1"), {
    none: {
      academicYearId: "year-1",
      id: { not: "enrollment-1" },
    },
  });
});

test("accepts an ISO admission date or an empty optional date", () => {
  assert.equal(
    studentEnrollmentSchema.safeParse({
      ...validEnrollment,
      admissionDate: "2026-06-15",
    }).success,
    true,
  );
  assert.equal(
    studentEnrollmentSchema.safeParse({
      ...validEnrollment,
      admissionDate: "",
    }).success,
    true,
  );
});

test("rejects malformed or impossible admission dates", () => {
  for (const admissionDate of ["15/06/2026", "2026-02-30", "not-a-date"]) {
    assert.equal(
      studentEnrollmentSchema.safeParse({
        ...validEnrollment,
        admissionDate,
      }).success,
      false,
    );
  }
});
