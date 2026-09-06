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
