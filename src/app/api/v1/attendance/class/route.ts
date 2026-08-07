import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { searchParams } = new URL(req.url);

    const classId =
      searchParams.get("classId");

    const sectionId =
      searchParams.get("sectionId");

    if (!classId || !sectionId) {
      throw new Error(
        "classId and sectionId are required."
      );
    }

    const data =
      await attendanceService.classAttendance(
        tenant.schoolId,
        classId,
        sectionId
      );

    return ApiResponse.success(data);
  });
}