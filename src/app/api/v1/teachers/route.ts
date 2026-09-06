import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { teacherSchema } from "@/features/teachers/schemas/teacher.schema";
import { teacherService } from "@/features/teachers/services/teacher.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const tenant = await requireTenant();
    const teachers = await teacherService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });
    return ApiResponse.success(teachers);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = teacherSchema.parse(await req.json());
    const teacher = await teacherService.create(tenant.schoolId, body);
    return ApiResponse.success(teacher, "Teacher created successfully.", 201);
  });
}
