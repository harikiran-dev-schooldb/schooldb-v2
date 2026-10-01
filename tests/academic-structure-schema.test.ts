import assert from "node:assert/strict";
import test from "node:test";

import {
  academicBranchSchema,
  syllabusSchema,
} from "../src/features/academic-structure/schemas.ts";
import { classSchema } from "../src/features/classes/schemas/class.schema.ts";

test("accepts configurable syllabi and academic branches", () => {
  assert.equal(syllabusSchema.safeParse({ name: "CBSE" }).success, true);
  assert.equal(
    academicBranchSchema.safeParse({
      syllabusId: "syllabus-1",
      name: "Primary",
    }).success,
    true,
  );
});

test("requires every class to belong to a syllabus and branch", () => {
  assert.equal(
    classSchema.safeParse({
      syllabusId: "syllabus-1",
      branchId: "branch-1",
      name: "Class 1",
    }).success,
    true,
  );
  assert.equal(classSchema.safeParse({ name: "Class 1" }).success, false);
});
