import assert from "node:assert/strict";
import test from "node:test";

import {
  isAutomatedWhatsappSourceAllowed,
  isManualWhatsappAnnouncementAllowed,
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
