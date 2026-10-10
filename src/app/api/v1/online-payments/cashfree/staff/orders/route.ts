import { cashfreeStaffOrderSchema } from "@/features/online-payments/schemas/cashfree-order.schema";
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
    const input = await validateBody(request, cashfreeStaffOrderSchema);
    const membership = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
      input.schoolSlug,
    );
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        schoolId: membership.schoolId,
        ...(input.studentEnrollmentId
          ? { id: input.studentEnrollmentId }
          : { studentId: input.studentId }),
        student: { status: { in: ["ACTIVE", "ALUMNI"] } },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, studentId: true },
    });
    if (!enrollment) throw new ApiError(404, "Active or alumni student enrollment not found.");

    const order = await cashfreePaymentService.createOrder({
      input: {
        schoolSlug: input.schoolSlug,
        studentId: enrollment.studentId,
        installmentIds: input.installmentIds,
        idempotencyKey: input.idempotencyKey,
        ...(input.customerPhone ? { customerPhone: input.customerPhone } : {}),
      },
      schoolId: membership.schoolId,
      enrollmentId: enrollment.id,
      requestedByUserId: membership.userId,
      requestOrigin: new URL(request.url).origin,
      initiator: "STAFF_QR",
    });

    return ApiResponse.success(order, "Cashfree payment is ready.", 201);
  });
}
