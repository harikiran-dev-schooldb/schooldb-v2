import type { ReportFilterInput } from "@/features/reports/report.service";

export function analyticsReportTag(schoolId: string) {
  return `management-analytics:school:${schoolId}`;
}

export function analyticsReportCacheKey(
  schoolId: string,
  input: ReportFilterInput,
) {
  return [
    schoolId,
    input.academicYearId ?? "",
    input.classId ?? "",
    input.sectionId ?? "",
    input.from ?? "",
    input.to ?? "",
  ];
}

export function analyticsPortfolioCacheKey(
  userId: string,
  range: { from: string; to: string },
) {
  return [userId, range.from, range.to];
}
