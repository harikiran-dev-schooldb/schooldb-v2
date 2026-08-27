import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentEnrollmentService } from "@/features/student-enrollments/services/student-enrollment.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } =
      new URL(request.url);

    const academicYearId =
      searchParams.get(
        "academicYearId",
      ) || undefined;

    const classId =
      searchParams.get("classId") ||
      undefined;

    const sectionId =
      searchParams.get("sectionId") ||
      undefined;

    const enrollments =
      await studentEnrollmentService.options(
        tenant.schoolId,
        {
          academicYearId,
          classId,
          sectionId,
        },
      );

    return ApiResponse.success(
      enrollments,
    );
  });
}