import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { z } from "zod";

import { feePaymentService } from "@/features/fee-payments/services/fee-payment.service";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const voidPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(
      3,
      "Void reason must be at least 3 characters.",
    )
    .max(
      500,
      "Void reason is too long.",
    ),
});

export async function POST(
  req: Request,
  { params }: Params,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const body = await req.json();

    const { reason } =
      voidPaymentSchema.parse(body);

    await feePaymentService.void(
      tenant.schoolId,
      id,
      reason,
    );

    return ApiResponse.success(
      null,
      "Payment voided successfully.",
    );
  });
}