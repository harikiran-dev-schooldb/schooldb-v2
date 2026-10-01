import { academicStructureService } from "@/features/academic-structure/service";
import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const syllabusId = new URL(request.url).searchParams.get("syllabusId");
    if (!syllabusId) throw new Error("syllabusId is required.");
    return ApiResponse.success(
      await academicStructureService.branchOptions(tenant.schoolId, syllabusId),
    );
  });
}
