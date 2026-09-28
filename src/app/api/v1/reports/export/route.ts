import { after } from "next/server";

import {
  processReportExportJob,
  queueSchoolReportExport,
} from "@/features/reports/report-export.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export const maxDuration = 300;

/** Backward-compatible endpoint. New clients use /api/v1/report-exports. */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { searchParams } = new URL(request.url);
    const job = await queueSchoolReportExport({
      schoolId: membership.schoolId,
      requestedByUserId: membership.userId,
      filters: {
        academicYearId: searchParams.get("academicYearId") || undefined,
        classId: searchParams.get("classId") || undefined,
        sectionId: searchParams.get("sectionId") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      },
    });
    after(() => processReportExportJob(job.id));
    return ApiResponse.success(
      { id: job.id, status: job.status },
      "Your report is being prepared.",
      202,
    );
  });
}
