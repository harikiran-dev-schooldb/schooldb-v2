import { apiHandler } from "@/lib/api";
import { requireTeacherAttendanceSession, requireTeacherFeatureAccess } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { canUnlockAttendance } from "@/features/attendance/policy";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const { id } = await params;
    const tenant = await requireTeacherAttendanceSession(id);
    if (tenant.role === "TEACHER") await requireTeacherFeatureAccess("ATTENDANCE");

    const result =
      await attendanceService.getSession(
        tenant.schoolId,
        id
      );

    return ApiResponse.success({
      ...result,
      permissions: {
        canUnlockAttendance: canUnlockAttendance(
          tenant.role,
          tenant.designation,
        ),
      },
    });
  });
}
