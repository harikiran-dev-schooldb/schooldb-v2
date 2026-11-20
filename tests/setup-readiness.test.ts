import assert from "node:assert/strict";
import test from "node:test";

import { buildSetupReadiness } from "../src/features/school-setup/setup-readiness.ts";

const branch = { name: "Primary", syllabus: { name: "CBSE" } };
const math = { id: "math", name: "Mathematics" };
const science = { id: "science", name: "Science" };

test("readiness requires a teacher and a timetable slot for every mapped subject, per section", () => {
  const overview = buildSetupReadiness([{
    id: "class-x",
    name: "X",
    branch,
    sections: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }],
    classSubjects: [{ subject: math }, { subject: science }],
    allocations: [
      { id: "mat-a", sectionId: "a", subjectId: "math", timetables: [{ id: "slot-a" }] },
      { id: "sci-a", sectionId: "a", subjectId: "science", timetables: [] },
      { id: "mat-b", sectionId: "b", subjectId: "math", timetables: [{ id: "slot-b" }] },
      { id: "art-b", sectionId: "b", subjectId: "art", timetables: [{ id: "slot-unmapped" }] },
      { id: "mat-c", sectionId: "c", subjectId: "math", timetables: [{ id: "slot-c" }] },
      { id: "mat-c-2", sectionId: "c", subjectId: "math", timetables: [] },
      { id: "sci-c", sectionId: "c", subjectId: "science", timetables: [{ id: "slot-c-science" }] },
    ],
  }]);

  assert.equal(overview.sectionCount, 3);
  assert.equal(overview.sectionsWithTeachers, 2);
  assert.equal(overview.sectionsWithTimetables, 1);
  assert.deepEqual(overview.rows[0].sections[0].missingSlots, [{ ...science, allocationId: "sci-a" }]);
  assert.deepEqual(overview.rows[0].sections[1].missingTeachers, [science]);
  assert.deepEqual(overview.rows[0].sections[2].missingSlots, []);
});

test("classes without active sections or subject mappings do not inflate readiness", () => {
  const overview = buildSetupReadiness([
    { id: "empty", name: "I", branch, sections: [], classSubjects: [{ subject: math }], allocations: [] },
    { id: "unmapped", name: "II", branch, sections: [{ id: "a", name: "A" }], classSubjects: [], allocations: [] },
  ]);

  assert.equal(overview.classesWithSections, 1);
  assert.equal(overview.classesWithSubjects, 1);
  assert.equal(overview.sectionCount, 1);
  assert.equal(overview.sectionsWithTeachers, 0);
  assert.equal(overview.sectionsWithTimetables, 0);
});
