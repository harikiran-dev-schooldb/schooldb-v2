import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import {
  studentPromotionSchema,
} from "@/features/student-enrollments/schemas/student-promotion.schema";

import {
  studentPromotionService,
} from "@/features/student-enrollments/services/student-promotion.service";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const input = await validateBody(
      request,
      studentPromotionSchema,
    );

    const result =
      await studentPromotionService.promote(
        tenant.schoolId,
        input,
      );

    return ApiResponse.success(
      result,
      "Students promoted successfully.",
    );
  });
}