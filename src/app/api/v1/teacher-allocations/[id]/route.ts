import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { teacherAllocationSchema } from "@/features/teacher-allocations/schemas/teacher-allocation.schema";
import { teacherAllocationService } from "@/features/teacher-allocations/services/teacher-allocation.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const { id } = await params;

    const tenant = await requireTenant();

    const allocation =
      await teacherAllocationService.get(
        id,
        tenant.schoolId
      );

    return ApiResponse.success(allocation);
  });
}

export async function PUT(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const { id } = await params;

    const body = await validateBody(
      req,
      teacherAllocationSchema
    );

    const tenant = await requireTenant();

    const allocation =
      await teacherAllocationService.update(
        id,
        tenant.schoolId,
        body
      );

    return ApiResponse.success(
      allocation,
      "Teacher allocation updated successfully."
    );
  });
}