import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { academicYearService } from "@/features/academic-years/services/academic-year.service";

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const year =
      await academicYearService.activate(
        id,
        tenant.schoolId
      );

    return ApiResponse.success(
      year,
      "Academic year activated successfully."
    );
  });
}