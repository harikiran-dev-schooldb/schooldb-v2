import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { requireStudentAccess } from "@/lib/student-access";
import { validateBody } from "@/lib/validation";
import { cashfreeOrderSchema } from "@/features/online-payments/schemas/cashfree-order.schema";
import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, cashfreeOrderSchema);
    const { membership, enrollment } = await requireStudentAccess(
      input.schoolSlug,
      input.studentId,
    );

    if (!enrollment) throw new ApiError(400, "No active enrollment was found.");

    const order = await cashfreePaymentService.createOrder({
      input,
      schoolId: membership.schoolId,
      enrollmentId: enrollment.id,
      requestedByUserId: membership.userId,
      requestOrigin: new URL(request.url).origin,
      userEmail: membership.user.email,
      userPhone: membership.user.phone,
    });

    return ApiResponse.success(order, "Secure checkout is ready.", 201);
  });
}
