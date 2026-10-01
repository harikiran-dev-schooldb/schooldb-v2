import { academicStructureService } from "@/features/academic-structure/service";
import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    return ApiResponse.success(
      await academicStructureService.syllabusOptions(tenant.schoolId),
    );
  });
}
