import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { teacherAllocationSchema } from "@/features/teacher-allocations/schemas/teacher-allocation.schema";
import { teacherAllocationService } from "@/features/teacher-allocations/services/teacher-allocation.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const tenant = await requireTenant();

    const data = await teacherAllocationService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });

    return ApiResponse.success(data);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(req, teacherAllocationSchema);
    const allocation = await teacherAllocationService.create(
      tenant.schoolId,
      body,
    );

    return ApiResponse.success(
      allocation,
      "Teacher allocated successfully.",
      201,
    );
  });
}
