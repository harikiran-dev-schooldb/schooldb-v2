import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { classSubjectService } from "@/features/class-subjects/services/class-subject.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);

    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");

    if (!academicYearId) {
      throw new Error("Academic year is required.");
    }

    if (!classId) {
      throw new Error("Class is required.");
    }

    const options = await classSubjectService.options(
      tenant.schoolId,
      academicYearId,
      classId,
    );

    return ApiResponse.success(options);
  });
}