export function canSubmitOwnProfileImage(
  role: string,
  designation: string | null = null,
) {
  if (role === "STUDENT" || role === "SUPER_ADMIN") return true;
  return role === "SCHOOL_ADMIN" && !/principal/i.test(designation ?? "");
}

export function canManageRosterProfileImages(role: string) {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export const canReviewStudentProfileImages = canManageRosterProfileImages;
