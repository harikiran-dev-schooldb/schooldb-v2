import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const data =
      await attendanceService.todayAttendance(
        tenant.schoolId
      );

    return ApiResponse.success(data);
  });
}