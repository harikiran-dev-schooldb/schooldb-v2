export const OPERATIONAL_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export const SELF_SERVICE_ROLES = ["PARENT", "STUDENT"] as const;

export function isOperationalRole(role: string): boolean {
  return (OPERATIONAL_ROLES as readonly string[]).includes(role);
}

export function isSelfServiceRole(role: string): boolean {
  return (SELF_SERVICE_ROLES as readonly string[]).includes(role);
}

export function isStudentIdAccessible(
  students: readonly { id: string }[],
  studentId: string,
): boolean {
  return students.some((student) => student.id === studentId);
}
