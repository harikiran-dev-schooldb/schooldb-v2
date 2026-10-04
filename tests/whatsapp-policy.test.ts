import assert from "node:assert/strict";
import test from "node:test";

import {
  isAutomatedWhatsappSourceAllowed,
  isManualWhatsappAnnouncementAllowed,
  staffAttendanceWhatsappTemplateParameters,
} from "../src/features/whatsapp/policy.ts";

test("limits automated WhatsApp to approved operational alerts", () => {
  assert.equal(isAutomatedWhatsappSourceAllowed("ATTENDANCE"), true);
  assert.equal(isAutomatedWhatsappSourceAllowed("STAFF_ATTENDANCE"), true);
  assert.equal(isAutomatedWhatsappSourceAllowed("BIRTHDAY"), true);
  assert.equal(isAutomatedWhatsappSourceAllowed("PROMOTION"), true);
  assert.equal(isAutomatedWhatsappSourceAllowed("HOMEWORK"), false);
  assert.equal(isAutomatedWhatsappSourceAllowed("RESULT"), false);
  assert.equal(isAutomatedWhatsappSourceAllowed("FEE_DUE"), false);
  assert.equal(isAutomatedWhatsappSourceAllowed("ANNOUNCEMENT"), false);
});

test("keeps manual WhatsApp announcements disabled", () => {
  assert.equal(isManualWhatsappAnnouncementAllowed(), false);
});

test("builds staff attendance template parameters in the approved order", () => {
  assert.deepEqual(
    staffAttendanceWhatsappTemplateParameters({
      teacherName: "Ananya Rao",
      attendanceDate: "2026-10-04",
      schoolName: "Kotak Salesian School",
    }),
    ["Ananya Rao", "4 Oct 2026", "Kotak Salesian School"],
  );
});
