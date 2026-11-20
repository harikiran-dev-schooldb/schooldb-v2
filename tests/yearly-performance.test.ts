import assert from "node:assert/strict";
import test from "node:test";

import { annualGrade } from "../src/features/exams/yearly-performance.ts";

test("annual academic grades use stable percentage bands", () => {
  assert.equal(annualGrade(94.5), "A+");
  assert.equal(annualGrade(80), "A");
  assert.equal(annualGrade(79.99), "B+");
  assert.equal(annualGrade(40), "D");
  assert.equal(annualGrade(39.99), "E");
});

test("annual academic grades do not invent a grade without numeric marks", () => {
  assert.equal(annualGrade(null), "—");
});

test("annual academic grades accept a school grading policy", () => {
  const bands = [
    { label: "O", minimumPercentage: 85 },
    { label: "S", minimumPercentage: 50 },
    { label: "N", minimumPercentage: 0 },
  ];
  assert.equal(annualGrade(88, bands), "O");
  assert.equal(annualGrade(67, bands), "S");
  assert.equal(annualGrade(20, bands), "N");
});
