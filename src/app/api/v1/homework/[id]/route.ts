import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { homeworkSchema } from "@/features/homework/schemas/homework.schema";
import { homeworkService } from "@/features/homework/services/homework.service";

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
    const tenant = await requireTenant();

    const { id } = await params;

    const item =
      await homeworkService.get(
        id,
        tenant.schoolId
      );

    return ApiResponse.success(item);
  });
}

export async function PUT(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const body = await validateBody(
      req,
      homeworkSchema
    );

    const item =
      await homeworkService.update(
        id,
        tenant.schoolId,
        body
      );

    return ApiResponse.success(
      item,
      "Homework updated successfully."
    );
  });
}

export async function DELETE(
  req: Request,
  { params }: Props
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    await homeworkService.delete(
      id,
      tenant.schoolId
    );

    return ApiResponse.success(
      null,
      "Homework deleted successfully."
    );
  });
}