type AttendanceResult = {
  total: number;
  attendancePercentage: number;
};

type StudentWithRollNumber = {
  rollNo: number | null;
  fullName: string | null;
};

export function isLowAttendance(
  result: AttendanceResult,
  threshold: number,
) {
  return result.total > 0 && result.attendancePercentage < threshold;
}

export function compareStudentsByRollNumber(
  first: StudentWithRollNumber,
  second: StudentWithRollNumber,
) {
  if (first.rollNo === null && second.rollNo === null) {
    return (first.fullName ?? "").localeCompare(second.fullName ?? "");
  }

  if (first.rollNo === null) {
    return 1;
  }

  if (second.rollNo === null) {
    return -1;
  }

  return (
    first.rollNo - second.rollNo ||
    (first.fullName ?? "").localeCompare(second.fullName ?? "")
  );
}
