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
