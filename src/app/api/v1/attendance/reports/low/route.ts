import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } =
      new URL(req.url);

    const academicYearId =
      searchParams.get(
        "academicYearId"
      ) ?? "";

    const classId =
      searchParams.get("classId") ??
      undefined;

    const sectionId =
      searchParams.get("sectionId") ??
      undefined;

    const fromDate =
      searchParams.get("fromDate") ??
      undefined;

    const toDate =
      searchParams.get("toDate") ??
      undefined;

    const threshold = Number(
      searchParams.get(
        "threshold"
      ) ?? 75
    );

    if (!academicYearId) {
      throw new Error(
        "Academic year is required."
      );
    }

    if (
      Number.isNaN(threshold) ||
      threshold < 0 ||
      threshold > 100
    ) {
      throw new Error(
        "Threshold must be between 0 and 100."
      );
    }

    const result =
      await attendanceService.lowAttendanceReport(
        tenant.schoolId,
        academicYearId,
        classId,
        sectionId,
        fromDate,
        toDate,
        threshold
      );

    return ApiResponse.success(result);
  });
}