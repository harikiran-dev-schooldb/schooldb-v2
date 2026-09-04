import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { feeCategorySchema } from "@/features/fees/schemas/fee-category.schema";
import { feeCategoryService } from "@/features/fees/services/fee-category.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const categories = await feeCategoryService.list(tenant.schoolId);
    return ApiResponse.success(categories);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
    ]);
    const body = await validateBody(req, feeCategorySchema);
    const category = await feeCategoryService.create(tenant.schoolId, body);
    return ApiResponse.success(
      category,
      "Fee category created successfully.",
      201,
    );
  });
}
