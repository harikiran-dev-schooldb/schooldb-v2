export function canSubmitOwnProfileImage(role: string) {
  return ["STUDENT", "SUPER_ADMIN", "SCHOOL_ADMIN"].includes(role);
}

export function canManageRosterProfileImages(role: string) {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export const canReviewStudentProfileImages = canManageRosterProfileImages;
