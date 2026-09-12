import { cashfreeOrderSchema } from "@/features/online-payments/schemas/cashfree-order.schema";
import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, cashfreeOrderSchema);
    const membership = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      input.schoolSlug,
    );
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        schoolId: membership.schoolId,
        studentId: input.studentId,
        active: true,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!enrollment) throw new ApiError(404, "Active student enrollment not found.");

    const order = await cashfreePaymentService.createOrder({
      input,
      schoolId: membership.schoolId,
      enrollmentId: enrollment.id,
      requestedByUserId: membership.userId,
      requestOrigin: new URL(request.url).origin,
      initiator: "STAFF_QR",
    });

    return ApiResponse.success(order, "Payment QR is ready.", 201);
  });
}
