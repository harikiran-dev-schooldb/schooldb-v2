import { apiHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant =
      await requirePermission(PERMISSIONS.ATTENDANCE_READ);

    const result =
      await attendanceService.dashboard(
        tenant.schoolId,
      );

    return ApiResponse.success(result);
  });
}
