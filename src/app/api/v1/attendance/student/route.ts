import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { searchParams } = new URL(req.url);

    const studentId =
      searchParams.get("studentId");

    if (!studentId) {
      throw new Error(
        "studentId is required."
      );
    }

    const data =
      await attendanceService.studentAttendance(
        tenant.schoolId,
        studentId
      );

    return ApiResponse.success(data);
  });
}