import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { classSubjectService } from "@/features/class-subjects/services/class-subject.service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await context.params;

    await classSubjectService.remove(id, tenant.schoolId);

    return ApiResponse.success(
      null,
      "Subject removed from class successfully.",
    );
  });
}
