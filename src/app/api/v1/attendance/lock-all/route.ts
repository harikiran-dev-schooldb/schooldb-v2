import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  attendanceService,
} from "@/features/attendance/services/attendance.service";

export async function POST(
  req: Request,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const body = await req.json();

    const {
      academicYearId,
      attendanceDate,
    } = body;

    if (!academicYearId) {
      throw new Error(
        "Academic year is required.",
      );
    }

    if (!attendanceDate) {
      throw new Error(
        "Attendance date is required.",
      );
    }

    const result =
      await attendanceService.lockAllAttendanceSessions(
        tenant.schoolId,
        academicYearId,
        attendanceDate,
      );

    if (
      result.incompleteCount > 0
    ) {
      return ApiResponse.success(
        result,
        "Some attendance sessions are incomplete.",
      );
    }

    return ApiResponse.success(
      result,
      result.lockedCount > 0
        ? "All completed attendance sessions have been locked."
        : "All attendance sessions were already locked.",
    );
  });
}