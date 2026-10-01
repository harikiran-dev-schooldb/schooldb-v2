import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { classService } from "@/features/classes/services/class.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const params = new URL(request.url).searchParams;
    const classes = await classService.options(tenant.schoolId, {
      syllabusId: params.get("syllabusId") ?? undefined,
      branchId: params.get("branchId") ?? undefined,
    });

    return ApiResponse.success(classes);
  });
}
