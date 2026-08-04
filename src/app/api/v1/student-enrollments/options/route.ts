import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentEnrollmentService } from "@/features/student-enrollments/services/student-enrollment.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const enrollments =
      await studentEnrollmentService.options(
        tenant.schoolId
      );

    return ApiResponse.success(enrollments);
  });
}