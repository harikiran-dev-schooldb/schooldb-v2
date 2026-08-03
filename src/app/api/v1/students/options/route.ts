import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentService } from "@/features/students/services/student.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const students =
      await studentService.options(
        tenant.schoolId
      );

    return ApiResponse.success(students);
  });
}