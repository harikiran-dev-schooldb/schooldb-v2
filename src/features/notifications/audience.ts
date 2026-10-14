export function notificationAudienceIncludesAdmins(
  targetType: string,
  sourceType?: string | null,
) {
  return !sourceType && (targetType === "CLASS" || targetType === "SECTION");
}
