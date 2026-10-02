import { apiHandler } from "@/lib/api";
import {
  requireRole,
  requireClassTeacherClassSection,
  requireTeacherTimetable,
} from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { attendanceSessionSchema } from "@/features/attendance/schemas/attendance-session.schema";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    const body = await validateBody(req, attendanceSessionSchema);

    if (tenant.role === "TEACHER") {
      if (body.sessionType === "PERIOD") {
        if (!body.timetableId) {
          throw new Error("Timetable is required for period attendance.");
        }
        await requireTeacherTimetable(body.timetableId);
      } else {
        await requireClassTeacherClassSection(
          body.classId,
          body.sectionId,
          body.academicYearId,
        );
      }
    }

    const session = await attendanceService.createSession(
      tenant.schoolId,
      body,
    );

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "CREATE",
      entityType: "ATTENDANCE_SESSION",
      entityId: session.id,
      summary: "Created or opened an attendance session for a class section.",
    });

    return ApiResponse.success(session, "Attendance session created.", 201);
  });
}
