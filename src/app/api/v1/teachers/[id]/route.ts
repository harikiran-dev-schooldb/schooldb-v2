import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireRole, requireTenant } from "@/lib/auth";

import { teacherSchema } from "@/features/teachers/schemas/teacher.schema";
import { teacherService } from "@/features/teachers/services/teacher.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;
    const teacher = await teacherService.get(id, tenant.schoolId);
    return ApiResponse.success(teacher);
  });
}

export async function PUT(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const body = teacherSchema.parse(await req.json());
    const teacher = await teacherService.update(id, tenant.schoolId, body);
    return ApiResponse.success(teacher, "Teacher updated successfully.");
  });
}
