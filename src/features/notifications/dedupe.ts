export const notificationDedupeKey = {
  homeworkPublished: (homeworkId: string) => `HOMEWORK:${homeworkId}:PUBLISHED`,
  examResultsPublished: (examId: string, targetType: "CLASS" | "SECTION", targetId: string) =>
    `EXAM:${examId}:RESULTS:${targetType}:${targetId}`,
  birthday: (studentId: string, dateKey: string) => `BIRTHDAY:${studentId}:${dateKey}`,
  feePayment: (paymentId: string) => `FEE_PAYMENT:${paymentId}`,
  feeReminder: (studentId: string, dateKey: string) => `FEE_REMINDER:${studentId}:${dateKey}`,
  attendanceSummary: (sessionId: string) => `ATTENDANCE_SUMMARY:${sessionId}`,
  attendanceAbsent: (sessionId: string, studentId: string) => `ATTENDANCE:${sessionId}:ABSENT:${studentId}`,
  staffAttendanceSummary: (dateKey: string) => `STAFF_ATTENDANCE:${dateKey}:SUMMARY`,
  staffAttendanceAbsent: (dateKey: string, teacherId: string) =>
    `STAFF_ATTENDANCE:${dateKey}:ABSENT:${teacherId}`,
  leaveSubmitted: (requestId: string) => `LEAVE_REQUEST:${requestId}:SUBMITTED`,
  leaveDecided: (requestId: string, status: string) => `LEAVE_REQUEST:${requestId}:${status}`,
  profileImageSubmitted: (studentId: string, storageKey: string) =>
    `PROFILE_IMAGE:${studentId}:${storageKey}:SUBMITTED`,
} as const;
