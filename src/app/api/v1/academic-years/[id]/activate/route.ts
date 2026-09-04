import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { academicYearService } from "@/features/academic-years/services/academic-year.service";

export async function PATCH(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id } = await params;

    const year = await academicYearService.activate(
      id,
      tenant.schoolId,
    );

    return ApiResponse.success(
      year,
      "Academic year activated successfully.",
    );
  });
}
