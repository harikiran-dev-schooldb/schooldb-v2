import assert from "node:assert/strict";
import test from "node:test";

import { isSchoolDbProductionHost } from "../src/lib/production-domain.ts";

test("allows the SchoolDB production domain and its subdomains", () => {
  assert.equal(isSchoolDbProductionHost("schooldb.co.in"), true);
  assert.equal(isSchoolDbProductionHost("app.schooldb.co.in"), true);
  assert.equal(isSchoolDbProductionHost("SCHOOLDB.CO.IN."), true);
});

test("rejects Vercel, local, and deceptive hostnames", () => {
  assert.equal(
    isSchoolDbProductionHost("schooldb-v2-example.vercel.app"),
    false,
  );
  assert.equal(isSchoolDbProductionHost("localhost"), false);
  assert.equal(isSchoolDbProductionHost("schooldb.co.in.example.com"), false);
  assert.equal(isSchoolDbProductionHost("evilschooldb.co.in"), false);
});
