import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import {
  feePaymentSchema,
} from "@/features/fee-payments/schemas/fee-payment.schema";

import {
  feePaymentService,
} from "@/features/fee-payments/services/fee-payment.service";

export async function POST(
  req: Request,
) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const body =
      await validateBody(
        req,
        feePaymentSchema,
      );

    const payment =
      await feePaymentService.create(
        tenant.schoolId,
        body,
      );

    return ApiResponse.success(
      payment,
      "Fee payment recorded successfully.",
      201,
    );
  });
}