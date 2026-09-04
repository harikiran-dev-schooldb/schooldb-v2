import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { classSchema } from "@/features/classes/schemas/class.schema";
import { classService } from "@/features/classes/services/class.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const classes = await classService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });
    return ApiResponse.success(classes);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await req.json();
    const parsed = classSchema.parse(body);
    const item = await classService.create(tenant.schoolId, parsed);
    return ApiResponse.success(item, "Class created successfully.", 201);
  });
}
