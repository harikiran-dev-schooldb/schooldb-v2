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

export function staffAttendanceWhatsappTemplateParameters(input: {
  teacherName: string;
  attendanceDate: string;
  schoolName: string;
}) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.attendanceDate);
  const date = validDate
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${input.attendanceDate}T00:00:00.000Z`))
    : input.attendanceDate;

  return [input.teacherName, date, input.schoolName];
}
