import { apiHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requirePermission(PERMISSIONS.ATTENDANCE_READ);

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

    const statusParam = searchParams.get("status");
    if (
      statusParam &&
      statusParam !== "COMPLETED" &&
      statusParam !== "PENDING"
    ) {
      return ApiResponse.error("Invalid attendance status filter.", 400);
    }

    const status =
      statusParam === "COMPLETED" || statusParam === "PENDING"
        ? statusParam
        : undefined;

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
          status,
        }
      );

    return ApiResponse.success(result);
  });
}
