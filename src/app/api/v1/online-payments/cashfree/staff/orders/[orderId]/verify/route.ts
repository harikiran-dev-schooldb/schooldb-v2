import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return apiHandler(async () => {
    const { orderId } = await params;
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
    const membership = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      schoolSlug,
    );
    const localOrder = await prisma.cashfreePaymentOrder.findFirst({
      where: {
        providerOrderId: orderId,
        schoolId: membership.schoolId,
        initiatedBy: "STAFF_QR",
      },
      select: { id: true },
    });
    if (!localOrder) throw new ApiError(404, "Payment order not found.");

    const order = await cashfreePaymentService.verifyAndSettle(orderId);
    return ApiResponse.success({
      status: order.status,
      feePaymentId: order.feePaymentId,
      amount: Number(order.amount),
    });
  });
}
