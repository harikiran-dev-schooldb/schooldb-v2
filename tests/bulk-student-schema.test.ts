import assert from "node:assert/strict";
import test from "node:test";

import { bulkStudentRowSchema } from "../src/features/students/schemas/bulk-student.schema.ts";

const validStudent = {
  admissionNo: "14570",
  fullName: "Harikiran Adangi",
  gender: "MALE",
  dob: "2011-10-03",
  phone: "7801049830",
  email: "",
  status: "ACTIVE",
};

test("accepts a valid bulk student row", () => {
  assert.equal(bulkStudentRowSchema.safeParse(validStudent).success, true);
});

test("rejects impossible dates before starting a bulk insert", () => {
  for (const dob of ["2011-02-30", "2011-13-01", "03/10/2011"]) {
    assert.equal(
      bulkStudentRowSchema.safeParse({ ...validStudent, dob }).success,
      false,
    );
  }
});

test("accepts and normalizes the extended student profile fields", () => {
  const result = bulkStudentRowSchema.safeParse({
    ...validStudent,
    joinedDate: "2025-06-01",
    alternatePhone: " 9876500000 ",
    religion: "hindu",
    category: "bc_a",
    fatherIncome: "250000.50",
    motherEmail: "mother@example.com",
    hostelRequired: "no",
    transportRequired: "YES",
    whatsappOptIn: "1",
  });

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.data.alternatePhone, "9876500000");
  assert.equal(result.data.religion, "HINDU");
  assert.equal(result.data.category, "BC_A");
  assert.equal(result.data.fatherIncome, 250000.5);
  assert.equal(result.data.hostelRequired, false);
  assert.equal(result.data.transportRequired, true);
  assert.equal(result.data.whatsappOptIn, true);
});

test("keeps extended fields optional for older bulk-import clients", () => {
  const result = bulkStudentRowSchema.safeParse(validStudent);

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.data.joinedDate, null);
  assert.equal(result.data.fatherIncome, null);
  assert.equal(result.data.transportRequired, false);
});

test("accepts enrollment details in the student import row", () => {
  const result = bulkStudentRowSchema.safeParse({
    ...validStudent,
    academicYear: "2026-27",
    className: "Class 10",
    sectionName: "A",
    rollNo: "12",
  });

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.data.academicYear, "2026-27");
  assert.equal(result.data.className, "Class 10");
  assert.equal(result.data.sectionName, "A");
  assert.equal(result.data.rollNo, 12);
});

test("requires complete enrollment details when any enrollment field is used", () => {
  for (const overrides of [
    { academicYear: "2026-27" },
    { className: "Class 10" },
    { sectionName: "A" },
    { rollNo: "12" },
    {
      academicYear: "2026-27",
      className: "Class 10",
      sectionName: "A",
      rollNo: "0",
    },
  ]) {
    assert.equal(
      bulkStudentRowSchema.safeParse({ ...validStudent, ...overrides }).success,
      false,
    );
  }
});

test("rejects invalid extended profile values", () => {
  for (const overrides of [
    { joinedDate: "2025-02-30" },
    { category: "INVALID" },
    { fatherIncome: "-1" },
    { motherEmail: "not-an-email" },
    { transportRequired: "sometimes" },
  ]) {
    assert.equal(
      bulkStudentRowSchema.safeParse({ ...validStudent, ...overrides }).success,
      false,
    );
  }
});
