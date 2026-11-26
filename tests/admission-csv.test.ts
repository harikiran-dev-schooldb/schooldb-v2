import test from "node:test";import assert from "node:assert/strict";import { csvCell } from "../src/features/admissions/csv.ts";
test("admission CSV safely escapes formulas and quotes",()=>{assert.equal(csvCell("=1+1"),"\"'=1+1\"");assert.equal(csvCell("a,b"),"\"a,b\"");assert.equal(csvCell('a"b'),'"a""b"');});
