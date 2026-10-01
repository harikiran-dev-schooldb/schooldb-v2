import { academicStructureService } from "@/features/academic-structure/service";
import { syllabusSchema } from "@/features/academic-structure/schemas";
import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    return ApiResponse.success(
      await academicStructureService.listSyllabi(tenant.schoolId),
    );
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = syllabusSchema.parse(await request.json());
    const item = await academicStructureService.createSyllabus(tenant.schoolId, input);
    return ApiResponse.success(item, "Syllabus created successfully.", 201);
  });
}
