import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { teacherSchema } from "@/features/teachers/schemas/teacher.schema";
import { teacherService } from "@/features/teachers/services/teacher.service";

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

    const teacher = await teacherService.get(
      id,
      tenant.schoolId
    );

    return ApiResponse.success(teacher);
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
      teacherSchema
    );

    const tenant = await requireTenant();

    const teacher = await teacherService.update(
      id,
      tenant.schoolId,
      body
    );

    return ApiResponse.success(
      teacher,
      "Teacher updated successfully."
    );
  });
}