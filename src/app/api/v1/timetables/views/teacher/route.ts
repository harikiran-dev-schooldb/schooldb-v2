import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { timetableService } from "@/features/timetable/services/timetable.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const academicYearId =
      searchParams.get("academicYearId") ?? "";

    const teacherId =
      searchParams.get("teacherId") ?? "";

    const data =
      await timetableService.teacherView(
        tenant.schoolId,
        academicYearId,
        teacherId
      );

    return ApiResponse.success(data);
  });
}