import { apiHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { getAnalyticsSettings } from "@/features/reports/analytics-settings";

export async function GET() {
  return apiHandler(async () => {
    const tenant =
      await requirePermission(PERMISSIONS.ATTENDANCE_READ);

    const settings = await getAnalyticsSettings(tenant.schoolId);
    const result = await attendanceService.dashboard(tenant.schoolId, {
      threshold: settings.lowAttendanceThreshold,
      lateCountsAsPresent: settings.lateCountsAsPresent,
    });

    return ApiResponse.success(result);
  });
}
