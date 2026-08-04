import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { studentEnrollmentService } from "@/features/student-enrollments/services/student-enrollment.service";
import { studentEnrollmentSchema } from "@/features/student-enrollments/schemas/student-enrollment.schema";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;

    const enrollment =
      await studentEnrollmentService.get(
        id,
        tenant.schoolId
      );

    return ApiResponse.success(enrollment);
  });
}

export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { id } = await params;

    const body = await request.json();

    const input =
      studentEnrollmentSchema.parse(body);

    const enrollment =
      await studentEnrollmentService.update(
        id,
        tenant.schoolId,
        input
      );

    return ApiResponse.success(enrollment);
  });
}