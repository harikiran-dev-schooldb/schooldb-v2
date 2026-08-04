import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { sectionService } from "@/features/sections/services/section.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);

    const classId = searchParams.get("classId");

    if (!classId) {
      throw new Error("classId is required.");
    }

    const sections = await sectionService.options(
      tenant.schoolId,
      classId
    );

    return ApiResponse.success(sections);
  });
}