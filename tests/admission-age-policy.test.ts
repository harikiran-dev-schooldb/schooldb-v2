import test from "node:test";
import assert from "node:assert/strict";
import { completedAgeMonths, assessAge, validCalendarDate } from "../src/features/admissions/age-policy.ts";

test("calendar months and inclusive school-configured bounds", () => {
  const policy = { ageAsOfDate: "2027-06-01", rules: { first: { minMonths: 72, maxMonths: 84 } } };
  assert.equal(completedAgeMonths("2021-06-02", policy.ageAsOfDate), 71);
  assert.equal(assessAge("2021-06-01", policy, "first").status, "ELIGIBLE");
  assert.equal(assessAge("2020-06-01", policy, "first").status, "ELIGIBLE");
  assert.equal(assessAge("2020-05-01", policy, "first").status, "INELIGIBLE");
  assert.equal(assessAge("2027-06-02", policy, "first").status, "INVALID_DATE");
  assert.equal(assessAge("2021-06-01", policy, "second").status, "UNCONFIGURED");
  assert.equal(assessAge("2021-06-01", null, "first").status, "UNCONFIGURED");
  assert.equal(validCalendarDate("2027-02-29"), false);
  assert.equal(validCalendarDate("2028-02-29"), true);
});
