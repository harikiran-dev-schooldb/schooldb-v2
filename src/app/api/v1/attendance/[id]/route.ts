import { apiHandler } from "@/lib/api";
import { requireTeacherAttendanceSession, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { attendanceSchema } from "@/features/attendance/schemas/attendance.schema";
import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;

    const result = await attendanceService.list(
      tenant.schoolId,
      {
        page,
        pageSize,
        search,
      },
    );

    return ApiResponse.success(result);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const body = await validateBody(req, attendanceSchema);
    const tenant = await requireTeacherAttendanceSession(body.sessionId);

    const result = await attendanceService.markAttendance(
      tenant.schoolId,
      body,
    );

    return ApiResponse.success(
      result,
      "Attendance saved successfully.",
    );
  });
}
