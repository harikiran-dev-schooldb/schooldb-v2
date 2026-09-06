import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id } = await params;

    const result = await attendanceService.lockAttendanceSession(
      tenant.schoolId,
      id,
    );

    return ApiResponse.success(
      result,
      "Attendance session locked successfully.",
    );
  });
}
