export const STAFF_ACCOUNT_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export type StaffAccountRole = (typeof STAFF_ACCOUNT_ROLES)[number];

export function isStaffAccountRole(role: string): role is StaffAccountRole {
  return STAFF_ACCOUNT_ROLES.some((staffRole) => staffRole === role);
}

export function canManageStaffAccount(
  actor: { userId: string; role: string },
  target: { userId: string; role: string },
) {
  if (actor.userId === target.userId || target.role === "SUPER_ADMIN") {
    return false;
  }

  return (
    actor.role === "SUPER_ADMIN" ||
    (actor.role === "SCHOOL_ADMIN" && target.role !== "SCHOOL_ADMIN")
  );
}
