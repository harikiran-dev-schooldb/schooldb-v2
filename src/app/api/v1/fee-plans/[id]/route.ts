import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import {
  feePlanSchema,
} from "@/features/fees/schemas/fee-plan.schema";

import {
  feePlanService,
} from "@/features/fees/services/fee-plan.service";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: Request,
  { params }: Params,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const plan =
      await feePlanService.findById(
        id,
        tenant.schoolId,
      );

    if (!plan) {
      return ApiResponse.error(
        "Fee plan not found.",
        404,
      );
    }

    return ApiResponse.success(plan);
  });
}

export async function PATCH(
  req: Request,
  { params }: Params,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const { id } = await params;

    const body =
      await validateBody(
        req,
        feePlanSchema,
      );

    const plan =
      await feePlanService.update(
        id,
        tenant.schoolId,
        body,
      );

    return ApiResponse.success(
      plan,
      "Fee plan updated successfully.",
    );
  });
}