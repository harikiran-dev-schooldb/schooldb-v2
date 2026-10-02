import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";
import { classTeacherAssignmentSchema } from "@/features/class-teachers/schema";
import { classTeacherService } from "@/features/class-teachers/service";
import { recordAuditLog } from "@/lib/audit";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    return ApiResponse.success(
      await classTeacherService.get(id, membership.schoolId),
    );
  });
}

export async function PUT(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const body = await validateBody(req, classTeacherAssignmentSchema);
    const item = await classTeacherService.update(id, membership.schoolId, body);
    await recordAuditLog({
      actor: membership,
      module: "ACADEMICS",
      action: "UPDATE",
      entityType: "CLASS_TEACHER_ASSIGNMENT",
      entityId: item.id,
      summary: `Updated the class teacher for ${item.class.name} ${item.section.name}.`,
    });
    return ApiResponse.success(item, "Class teacher assignment updated.");
  });
}
