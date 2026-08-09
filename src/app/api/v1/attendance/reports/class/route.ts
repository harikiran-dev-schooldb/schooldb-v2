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
      searchParams.get("classId") ?? "";

    const sectionId =
      searchParams.get("sectionId") ?? "";

    const fromDate =
      searchParams.get("fromDate") ??
      undefined;

    const toDate =
      searchParams.get("toDate") ??
      undefined;

    if (!academicYearId) {
      throw new Error(
        "Academic year is required."
      );
    }

    if (!classId) {
      throw new Error(
        "Class is required."
      );
    }

    if (!sectionId) {
      throw new Error(
        "Section is required."
      );
    }

    const result =
      await attendanceService.classAttendanceReport(
        tenant.schoolId,
        academicYearId,
        classId,
        sectionId,
        fromDate,
        toDate
      );

    return ApiResponse.success(result);
  });
}