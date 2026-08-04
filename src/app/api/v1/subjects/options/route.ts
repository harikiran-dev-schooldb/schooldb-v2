import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { subjectService } from "@/features/subjects/services/subject.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const options =
      await subjectService.options(
        tenant.schoolId
      );

    return ApiResponse.success(options);
  });
}