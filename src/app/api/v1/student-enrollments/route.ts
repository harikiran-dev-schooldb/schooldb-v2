import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";



import { studentEnrollmentService } from "@/features/student-enrollments/services/student-enrollment.service";
import { studentEnrollmentSchema } from "@/features/student-enrollments/schemas/student-enrollment.schema";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") || undefined;

    const result = await studentEnrollmentService.list(
      tenant.schoolId,
      { page, pageSize, search }
    );

    return ApiResponse.success(result);
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await request.json();

    const input = studentEnrollmentSchema.parse(body);

    const enrollment =
      await studentEnrollmentService.create(
        tenant.schoolId,
        input
      );

    return ApiResponse.success(enrollment);
  });
}
