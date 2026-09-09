import assert from "node:assert/strict";
import test from "node:test";

import { publicAdmissionSchema } from "../src/features/admissions/admission.schema.ts";

const validApplication = {
  academicYearId: "cmtbp2yid0000wsw72wa3dy1d",
  applyingClassId: "cmtbm89tv000cklw7v7jvle71",
  preferredSectionId: "",
  studentName: "Sample Student",
  gender: "MALE",
  dob: "2017-06-12",
  studentAadhar: "",
  apaarId: "",
  previousSchool: "",
  fatherName: "Sample Parent",
  fatherPhone: "9876543210",
  motherName: "",
  motherPhone: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "",
  email: "",
  address: "Visakhapatnam",
  city: "Visakhapatnam",
  district: "Visakhapatnam",
  state: "Andhra Pradesh",
  pincode: "530001",
  medicalConditions: "",
  transportRequired: false,
  whatsappOptIn: true,
  website: "",
};

test("accepts an admission application with one complete parent contact", () => {
  assert.equal(publicAdmissionSchema.safeParse(validApplication).success, true);
});

test("requires consent and a parent or guardian contact", () => {
  assert.equal(
    publicAdmissionSchema.safeParse({
      ...validApplication,
      whatsappOptIn: false,
    }).success,
    false,
  );
  assert.equal(
    publicAdmissionSchema.safeParse({
      ...validApplication,
      fatherName: "",
      fatherPhone: "",
    }).success,
    false,
  );
});

test("validates optional Aadhaar and mobile formats", () => {
  assert.equal(
    publicAdmissionSchema.safeParse({
      ...validApplication,
      studentAadhar: "1234",
    }).success,
    false,
  );
  assert.equal(
    publicAdmissionSchema.safeParse({ ...validApplication, fatherPhone: "123" })
      .success,
    false,
  );
});
