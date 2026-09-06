export const OPERATIONAL_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export function isOperationalRole(role: string): boolean {
  return (OPERATIONAL_ROLES as readonly string[]).includes(role);
}
