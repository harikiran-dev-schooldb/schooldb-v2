import {
  audienceVisibility,
  type StudentAudienceScope,
} from "../audiences/types.ts";

export function notificationVisibility(
  schoolId: string,
  students: StudentAudienceScope[],
  now = new Date(),
) {
  return {
    schoolId,
    archived: false,
    publishedAt: { lte: now },
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: audienceVisibility(students) },
    ],
  };
}
