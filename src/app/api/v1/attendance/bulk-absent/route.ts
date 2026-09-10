import { z } from "zod";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

const schema = z
  .object({
    academicYearId: z.string().min(1),
    attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scope: z.enum(["SCHOOL", "CLASS", "SECTION"]),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    studentIds: z.array(z.string().min(1)).min(1).max(500),
    sessionChoice: z.enum(["MORNING", "AFTERNOON", "BOTH"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.scope !== "SCHOOL" && !value.classId) {
      context.addIssue({ code: "custom", path: ["classId"], message: "Class is required." });
    }
    if (value.scope === "SECTION" && !value.sectionId) {
      context.addIssue({ code: "custom", path: ["sectionId"], message: "Section is required." });
    }
  });

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0]?.message || "Invalid absentee selection.", 400);
    }

    const result = await attendanceService.markBulkAbsentees(
      tenant.schoolId,
      parsed.data,
    );

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "UPDATE",
      entityType: "ATTENDANCE_SESSION",
      summary: `Marked ${result.studentCount} students absent across ${result.sessionCount} attendance sessions.`,
      metadata: {
        scope: parsed.data.scope,
        attendanceDate: parsed.data.attendanceDate,
        classId: parsed.data.classId ?? null,
        sectionId: parsed.data.sectionId ?? null,
        studentIds: parsed.data.studentIds,
      },
    });

    return ApiResponse.success(
      result,
      `${result.studentCount} students marked absent successfully.`,
    );
  });
}
