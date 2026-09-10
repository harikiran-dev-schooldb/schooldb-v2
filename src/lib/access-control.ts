export const OPERATIONAL_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export const SELF_SERVICE_ROLES = ["PARENT", "STUDENT"] as const;

export const PERMISSIONS = {
  STUDENT_DIRECTORY_READ: "student-directory:read",
  STUDENT_PRIVATE_READ: "student-private:read",
  FEE_READ: "fees:read",
  ATTENDANCE_READ: "attendance:read",
  STAFF_READ: "staff:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  SCHOOL_ADMIN: Object.values(PERMISSIONS),
  TEACHER: [
    PERMISSIONS.STUDENT_DIRECTORY_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.STAFF_READ,
  ],
  ACCOUNTANT: [PERMISSIONS.STUDENT_DIRECTORY_READ, PERMISSIONS.FEE_READ],
  RECEPTIONIST: [
    PERMISSIONS.STUDENT_DIRECTORY_READ,
    PERMISSIONS.STUDENT_PRIVATE_READ,
  ],
};

export function isOperationalRole(role: string): boolean {
  return (OPERATIONAL_ROLES as readonly string[]).includes(role);
}

export function isSelfServiceRole(role: string): boolean {
  return (SELF_SERVICE_ROLES as readonly string[]).includes(role);
}

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isStudentIdAccessible(
  students: readonly { id: string }[],
  studentId: string,
): boolean {
  return students.some((student) => student.id === studentId);
}
