import { z } from "zod";

import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { requireStudentAccess } from "@/lib/student-access";
import { validateBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const verifySchema = z.object({
  schoolSlug: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return apiHandler(async () => {
    const input = await validateBody(request, verifySchema);
    const { orderId } = await params;
    const { membership, enrollment } = await requireStudentAccess(
      input.schoolSlug,
      input.studentId,
    );
    if (!enrollment) throw new ApiError(400, "No active enrollment was found.");

    const localOrder = await prisma.cashfreePaymentOrder.findFirst({
      where: {
        providerOrderId: orderId,
        schoolId: membership.schoolId,
        studentEnrollmentId: enrollment.id,
      },
      select: { id: true },
    });
    if (!localOrder) throw new ApiError(404, "Payment order not found.");

    const order = await cashfreePaymentService.verifyAndSettle(orderId);
    return ApiResponse.success({
      orderId: order.providerOrderId,
      status: order.status,
      feePaymentId: order.feePaymentId,
      amount: Number(order.amount),
    });
  });
}
