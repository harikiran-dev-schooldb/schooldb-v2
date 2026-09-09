import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireTeacherAttendanceSession } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { recordAuditLog } from "@/lib/audit";

const correctionSchema = z.object({
  changes: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const { id } = await params;
    const tenant = await requireTeacherAttendanceSession(id);

    const body = await req.json();
    const input = correctionSchema.parse(body);

    const result = await attendanceService.bulkUpdateAttendance(
      tenant.schoolId,
      id,
      input.changes,
    );

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "CORRECT",
      entityType: "ATTENDANCE_SESSION",
      entityId: id,
      summary: `Corrected ${input.changes.length} attendance record${input.changes.length === 1 ? "" : "s"}.`,
      metadata: { recordCount: input.changes.length },
    });

    return ApiResponse.success(result, "Attendance corrected successfully.");
  });
}
