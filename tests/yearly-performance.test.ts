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
