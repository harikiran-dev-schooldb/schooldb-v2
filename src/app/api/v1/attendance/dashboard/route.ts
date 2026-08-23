import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const result =
      await attendanceService.dashboard(
        tenant.schoolId,
      );

    return ApiResponse.success(result);
  });
}