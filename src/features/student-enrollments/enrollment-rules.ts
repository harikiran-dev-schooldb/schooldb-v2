export function availableForAcademicYear(
  academicYearId: string,
  excludeEnrollmentId?: string,
) {
  return {
    none: {
      academicYearId,
      ...(excludeEnrollmentId
        ? {
            id: {
              not: excludeEnrollmentId,
            },
          }
        : {}),
    },
  };
}

type PromotionYear = {
  name: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
};

export function promotionYearError(
  source: PromotionYear,
  target: PromotionYear,
  requireActiveTarget = false,
): string | null {
  if (target.startDate <= source.endDate) {
    return `Target academic year ${target.name} must start after ${source.name} ends.`;
  }
  if (target.endDate <= target.startDate) {
    return `Target academic year ${target.name} has an invalid date range.`;
  }
  if (requireActiveTarget && !target.active) {
    return `Activate ${target.name} before promoting students. This prevents student accounts from switching to an unpublished academic year.`;
  }
  return null;
}
