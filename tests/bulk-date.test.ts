import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBulkDate } from "../src/lib/bulk-date.ts";

test("converts supported bulk date formats to ISO", () => {
  assert.equal(normalizeBulkDate("2012-06-15", "ISO"), "2012-06-15");
  assert.equal(normalizeBulkDate("15/06/2012", "DMY_SLASH"), "2012-06-15");
  assert.equal(normalizeBulkDate("15-06-12", "DMY_DASH"), "2012-06-15");
  assert.equal(normalizeBulkDate("06/15/2012", "MDY_SLASH"), "2012-06-15");
  assert.equal(normalizeBulkDate("06-15-12", "MDY_DASH"), "2012-06-15");
  assert.equal(normalizeBulkDate("41075", "EXCEL_SERIAL"), "2012-06-15");
});

test("rejects dates that do not match the selected format", () => {
  assert.equal(normalizeBulkDate("06/15/2012", "DMY_SLASH"), null);
  assert.equal(normalizeBulkDate("31/02/2026", "DMY_SLASH"), null);
  assert.equal(normalizeBulkDate("2026-13-01", "ISO"), null);
  assert.equal(normalizeBulkDate("text", "EXCEL_SERIAL"), null);
});
