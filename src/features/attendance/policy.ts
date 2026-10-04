export function canUnlockAttendance(
  role: string,
  designation: string | null | undefined,
) {
  if (role === "SUPER_ADMIN") return true;
  return role === "SCHOOL_ADMIN" && designation?.trim().toLowerCase() === "principal";
}
