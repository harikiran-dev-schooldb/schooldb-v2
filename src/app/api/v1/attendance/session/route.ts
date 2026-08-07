import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { attendanceSessionSchema } from "@/features/attendance/schemas/attendance-session.schema";
import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await validateBody(
      req,
      attendanceSessionSchema
    );

    const session =
      await attendanceService.createSession(
        tenant.schoolId,
        body
      );

    return ApiResponse.success(
      session,
      "Attendance session created.",
      201
    );
  });
}