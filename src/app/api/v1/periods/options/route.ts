import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { periodService } from "@/features/periods/services/period.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const options = await periodService.options(
      tenant.schoolId
    );

    return ApiResponse.success(options);
  });
}