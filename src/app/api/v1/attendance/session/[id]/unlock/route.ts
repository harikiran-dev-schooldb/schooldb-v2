import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";

import { canUnlockAttendance } from "@/features/attendance/policy";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { recordAuditLog } from "@/lib/audit";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    if (!canUnlockAttendance(tenant.role, tenant.designation)) {
      throw new ApiError(403, "Only a Super Admin or Principal can unlock attendance.");
    }

    const { id } = await params;
    const result = await attendanceService.unlockAttendanceSession(
      tenant.schoolId,
      id,
    );

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "UNLOCK",
      entityType: "ATTENDANCE_SESSION",
      entityId: id,
      summary: "Unlocked an attendance session for correction.",
    });

    return ApiResponse.success(result, "Attendance session unlocked.");
  });
}
