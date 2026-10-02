import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";
import { classTeacherAssignmentSchema } from "@/features/class-teachers/schema";
import { classTeacherService } from "@/features/class-teachers/service";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const search = new URL(req.url).searchParams.get("search")?.trim();
    const items = await classTeacherService.list(membership.schoolId, search);
    return ApiResponse.success(items);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(req, classTeacherAssignmentSchema);
    const item = await classTeacherService.create(membership.schoolId, body);
    await recordAuditLog({
      actor: membership,
      module: "ACADEMICS",
      action: "CREATE",
      entityType: "CLASS_TEACHER_ASSIGNMENT",
      entityId: item.id,
      summary: `Assigned ${item.teacher.fullName} as class teacher for ${item.class.name} ${item.section.name}.`,
    });
    return ApiResponse.success(item, "Class teacher assigned successfully.", 201);
  });
}
