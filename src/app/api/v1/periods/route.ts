import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { periodSchema } from "@/features/periods/schemas/period.schema";
import { periodService } from "@/features/periods/services/period.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;

    const result = await periodService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });

    return ApiResponse.success(result);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await validateBody(req, periodSchema);

    const period = await periodService.create(
      tenant.schoolId,
      body
    );

    return ApiResponse.success(
      period,
      "Period created successfully.",
      201
    );
  });
}