import test from "node:test";
import assert from "node:assert/strict";
import { stagesReady, reviewStages } from "../src/features/admissions/intake-policy.ts";
test("only passed or waived review stages permit approval and enrollment", () => {
  for(const entrance of reviewStages) for(const interview of reviewStages) {
    assert.equal(stagesReady(entrance,interview),["NOT_REQUIRED","PASSED"].includes(entrance)&&["NOT_REQUIRED","PASSED"].includes(interview));
  }
});
