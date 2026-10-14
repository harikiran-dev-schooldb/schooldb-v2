import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsPortfolioCacheKey,
  analyticsReportCacheKey,
  analyticsReportTag,
} from "../src/features/reports/analytics-cache-key.ts";

test("analytics report cache keys include the tenant and every report filter", () => {
  assert.deepEqual(
    analyticsReportCacheKey("school-1", {
      academicYearId: "year-1",
      classId: "class-1",
      sectionId: "section-1",
      from: "2026-06-01",
      to: "2026-06-30",
    }),
    [
      "school-1",
      "year-1",
      "class-1",
      "section-1",
      "2026-06-01",
      "2026-06-30",
    ],
  );
});

test("analytics report cache keys normalize missing filters", () => {
  assert.deepEqual(analyticsReportCacheKey("school-1", {}), [
    "school-1",
    "",
    "",
    "",
    "",
    "",
  ]);
});

test("portfolio cache keys are isolated by administrator and date range", () => {
  assert.deepEqual(
    analyticsPortfolioCacheKey("user-1", {
      from: "2026-06-01",
      to: "2026-06-30",
    }),
    ["user-1", "2026-06-01", "2026-06-30"],
  );
});

test("analytics report tags are isolated by school", () => {
  assert.equal(
    analyticsReportTag("school-1"),
    "management-analytics:school:school-1",
  );
});
