import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import {
  feeCategorySchema,
} from "@/features/fees/schemas/fee-category.schema";

import {
  feeCategoryRepository,
} from "@/features/fees/repositories/fee-category.repository";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const body = await validateBody(
      req,
      feeCategorySchema.partial(),
    );

    const category =
      await feeCategoryRepository.findById(
        id,
        tenant.schoolId,
      );

    if (!category) {
      throw new Error(
        "Fee category not found.",
      );
    }

    const result =
      await feeCategoryRepository.update(
        id,
        tenant.schoolId,
        body,
      );

    if (result.count === 0) {
      throw new Error(
        "Fee category could not be updated.",
      );
    }

    const updated =
      await feeCategoryRepository.findById(
        id,
        tenant.schoolId,
      );

    return ApiResponse.success(
      updated,
      "Fee category updated successfully.",
    );
  });
}

export async function GET(
  req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const category =
      await feeCategoryRepository.findById(
        id,
        tenant.schoolId,
      );

    if (!category) {
      throw new Error(
        "Fee category not found.",
      );
    }

    return ApiResponse.success(
      category,
    );
  });
}