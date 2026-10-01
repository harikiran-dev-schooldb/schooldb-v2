import { academicBranchSchema } from "@/features/academic-structure/schemas";
import { academicStructureService } from "@/features/academic-structure/service";
import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;
    return ApiResponse.success(
      await academicStructureService.getBranch(id, tenant.schoolId),
    );
  });
}

export async function PUT(request: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const input = academicBranchSchema.parse(await request.json());
    const item = await academicStructureService.updateBranch(id, tenant.schoolId, input);
    return ApiResponse.success(item, "Academic branch updated successfully.");
  });
}
