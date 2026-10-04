const AUTOMATED_WHATSAPP_SOURCES = new Set([
  "ATTENDANCE",
  "STAFF_ATTENDANCE",
  "BIRTHDAY",
  "PROMOTION",
]);

export function isAutomatedWhatsappSourceAllowed(sourceType: string) {
  return AUTOMATED_WHATSAPP_SOURCES.has(sourceType);
}

export function isManualWhatsappAnnouncementAllowed() {
  return false;
}
