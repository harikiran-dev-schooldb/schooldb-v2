import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { feePlanSchema } from "@/features/fees/schemas/fee-plan.schema";
import { feePlanService } from "@/features/fees/services/fee-plan.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const plans = await feePlanService.list(tenant.schoolId);
    return ApiResponse.success(plans);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
    ]);
    const body = await validateBody(req, feePlanSchema);
    const plan = await feePlanService.create(tenant.schoolId, body);
    return ApiResponse.success(plan, "Fee plan created successfully.", 201);
  });
}
