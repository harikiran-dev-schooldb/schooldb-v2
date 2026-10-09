import assert from "node:assert/strict";
import test from "node:test";

import {
  availableForAcademicYear,
  promotionYearError,
} from "../src/features/student-enrollments/enrollment-rules.ts";
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

const sourceYear = {
  name: "2025-26",
  startDate: new Date("2025-04-01T00:00:00.000Z"),
  endDate: new Date("2026-03-31T00:00:00.000Z"),
  active: true,
};

test("accepts the next active non-overlapping academic year", () => {
  assert.equal(
    promotionYearError(
      sourceYear,
      {
        name: "2026-27",
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2027-03-31T00:00:00.000Z"),
        active: true,
      },
      true,
    ),
    null,
  );
});

test("rejects backward or overlapping promotion years", () => {
  const message = promotionYearError(sourceYear, {
    name: "2025-26 overlap",
    startDate: new Date("2026-03-01T00:00:00.000Z"),
    endDate: new Date("2027-02-28T00:00:00.000Z"),
    active: true,
  });

  assert.match(message ?? "", /must start after/);
});

test("requires activation before executing promotion", () => {
  const message = promotionYearError(
    sourceYear,
    {
      name: "2026-27",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T00:00:00.000Z"),
      active: false,
    },
    true,
  );

  assert.match(message ?? "", /Activate 2026-27/);
});
