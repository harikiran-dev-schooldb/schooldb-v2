import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentService } from "@/features/students/services/student.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);

    const academicYearId = searchParams.get("academicYearId");

    if (!academicYearId) {
      throw new Error("Academic year is required.");
    }

    const students = await studentService.options(
      tenant.schoolId,
      academicYearId,
    );

    return ApiResponse.success(students);
  });
}