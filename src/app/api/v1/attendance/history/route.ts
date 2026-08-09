import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } =
      new URL(req.url);

    const page = Number(
      searchParams.get("page") ?? 1
    );

    const pageSize = Number(
      searchParams.get("pageSize") ?? 25
    );

    const academicYearId =
      searchParams.get(
        "academicYearId"
      ) ?? undefined;

    const classId =
      searchParams.get("classId") ??
      undefined;

    const sectionId =
      searchParams.get("sectionId") ??
      undefined;

    const date =
      searchParams.get("date") ??
      undefined;

    const result =
      await attendanceService.listSessions(
        tenant.schoolId,
        {
          page,
          pageSize,
          academicYearId,
          classId,
          sectionId,
          date,
        }
      );

    return ApiResponse.success(result);
  });
}