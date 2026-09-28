import { getFeeDashboard } from "@/features/fees/services/fee-dashboard.service";
import { PERMISSIONS } from "@/lib/access-control";
import { apiHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requirePermission(PERMISSIONS.FEE_READ);
    const academicYearId =
      new URL(req.url).searchParams.get("academicYearId") || undefined;

    return ApiResponse.success(
      await getFeeDashboard(tenant.schoolId, academicYearId),
    );
  });
}
