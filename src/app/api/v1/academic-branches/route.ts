import { academicBranchSchema } from "@/features/academic-structure/schemas";
import { academicStructureService } from "@/features/academic-structure/service";
import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const syllabusId = new URL(request.url).searchParams.get("syllabusId") ?? undefined;
    return ApiResponse.success(
      await academicStructureService.listBranches(tenant.schoolId, syllabusId),
    );
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = academicBranchSchema.parse(await request.json());
    const item = await academicStructureService.createBranch(tenant.schoolId, input);
    return ApiResponse.success(item, "Academic branch created successfully.", 201);
  });
}
