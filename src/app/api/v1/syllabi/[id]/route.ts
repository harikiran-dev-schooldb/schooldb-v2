import { academicStructureService } from "@/features/academic-structure/service";
import { syllabusSchema } from "@/features/academic-structure/schemas";
import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;
    return ApiResponse.success(
      await academicStructureService.getSyllabus(id, tenant.schoolId),
    );
  });
}

export async function PUT(request: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const input = syllabusSchema.parse(await request.json());
    const item = await academicStructureService.updateSyllabus(id, tenant.schoolId, input);
    return ApiResponse.success(item, "Syllabus updated successfully.");
  });
}
