import { z } from "zod";

import {
  cashfreePaymentService,
  hashCashfreePublicToken,
} from "@/features/online-payments/services/cashfree-payment.service";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(32).max(100) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return apiHandler(async () => {
    const { orderId } = await params;
    const { token } = await validateBody(request, schema);
    const localOrder = await prisma.cashfreePaymentOrder.findFirst({
      where: {
        providerOrderId: orderId,
        publicTokenHash: hashCashfreePublicToken(token),
        initiatedBy: "STAFF_QR",
      },
      select: { id: true },
    });
    if (!localOrder) throw new ApiError(404, "Payment link not found.");

    const order = await cashfreePaymentService.verifyAndSettle(orderId);
    return ApiResponse.success({
      status: order.status,
      feePaymentId: order.feePaymentId,
      amount: Number(order.amount),
    });
  });
}
