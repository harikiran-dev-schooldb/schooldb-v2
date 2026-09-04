import { apiHandler } from "@/lib/api";
import { requireRole, requireTeacherTimetable } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { attendanceSessionSchema } from "@/features/attendance/schemas/attendance-session.schema";
import { attendanceService } from "@/features/attendance/services/attendance.service";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    const body = await validateBody(req, attendanceSessionSchema);

    if (tenant.role === "TEACHER") {
      if (body.sessionType !== "PERIOD" || !body.timetableId) {
        throw new Error(
          "Teachers can create attendance sessions only for their assigned timetable periods.",
        );
      }

      await requireTeacherTimetable(body.timetableId);
    }

    const session = await attendanceService.createSession(
      tenant.schoolId,
      body,
    );

    return ApiResponse.success(session, "Attendance session created.", 201);
  });
}
