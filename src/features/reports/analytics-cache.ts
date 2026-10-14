import { revalidateTag, unstable_cache } from "next/cache";

import {
  analyticsPortfolioCacheKey,
  analyticsReportCacheKey,
  analyticsReportTag,
} from "@/features/reports/analytics-cache-key";
import { getSchoolPortfolio } from "@/features/reports/portfolio.service";
import {
  getSchoolReport,
  type ReportFilterInput,
} from "@/features/reports/report.service";

const ANALYTICS_CACHE_SECONDS = 30;
const PORTFOLIO_TAG = "management-analytics:portfolio";

export function getCachedSchoolReport(
  schoolId: string,
  input: ReportFilterInput,
) {
  const key = analyticsReportCacheKey(schoolId, input);

  return unstable_cache(
    () => getSchoolReport(schoolId, input),
    ["management-analytics-report-v1", ...key],
    {
      revalidate: ANALYTICS_CACHE_SECONDS,
      tags: [analyticsReportTag(schoolId)],
    },
  )();
}

export function getCachedSchoolPortfolio(
  userId: string,
  range: { from: string; to: string },
) {
  const key = analyticsPortfolioCacheKey(userId, range);

  return unstable_cache(
    () => getSchoolPortfolio(userId, range),
    ["management-analytics-portfolio-v1", ...key],
    {
      revalidate: ANALYTICS_CACHE_SECONDS,
      tags: [PORTFOLIO_TAG],
    },
  )();
}

export function invalidateAnalyticsCache(schoolId: string) {
  revalidateTag(analyticsReportTag(schoolId), { expire: 0 });
  revalidateTag(PORTFOLIO_TAG, { expire: 0 });
}
