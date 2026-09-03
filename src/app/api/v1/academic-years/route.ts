import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { academicYearSchema } from "@/features/academic-years/schemas/academic-year.schema";
import { academicYearService } from "@/features/academic-years/services/academic-year.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const result = await academicYearService.list(tenant.schoolId, { page, pageSize, search });
    return ApiResponse.success(result);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(req, academicYearSchema);
    const year = await academicYearService.create(tenant.schoolId, body);
    return ApiResponse.success(year, "Academic year created successfully.", 201);
  });
}