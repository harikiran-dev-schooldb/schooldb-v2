import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const studentId =
      searchParams.get("studentId") ?? "";

    const academicYearId =
      searchParams.get("academicYearId") ?? "";

    const fromDate =
      searchParams.get("fromDate") ?? undefined;

    const toDate =
      searchParams.get("toDate") ?? undefined;

    if (!studentId) {
      throw new Error("Student is required.");
    }

    if (!academicYearId) {
      throw new Error(
        "Academic year is required."
      );
    }

    const result =
      await attendanceService.studentAttendanceReport(
        tenant.schoolId,
        studentId,
        academicYearId,
        fromDate,
        toDate
      );

    return ApiResponse.success(result);
  });
}