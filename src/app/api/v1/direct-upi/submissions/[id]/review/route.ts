import { notifyFeePayment } from "@/features/notifications/events";
import { directUpiReviewSchema } from "@/features/online-payments/schemas/direct-upi-submission.schema";
import { directUpiPaymentService } from "@/features/online-payments/services/direct-upi-payment.service";
import { studentActivityService } from "@/features/students/services/student-activity.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const { id } = await params;
    const input = await validateBody(request, directUpiReviewSchema);
    const tenant = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
      input.schoolSlug,
    );

    const result = await directUpiPaymentService.review({
      schoolId: tenant.schoolId,
      submissionId: id,
      reviewedByUserId: tenant.userId,
      action: input.action,
      reason: input.reason,
    });

    if (result.payment) {
      const payment = result.payment;
      await studentActivityService.create({
        schoolId: tenant.schoolId,
        studentId: payment.studentEnrollment.studentId,
        enrollmentId: payment.studentEnrollmentId,
        performedByUserId: tenant.userId,
        type: "FEE_PAYMENT",
        title: "Direct UPI payment verified",
        description: `₹${Number(payment.amount).toLocaleString("en-IN")} verified. Receipt: ${payment.receiptNo}.`,
        sourceType: "FEE_PAYMENT",
        sourceId: payment.id,
        metadata: {
          receiptNo: payment.receiptNo,
          amount: Number(payment.amount),
          paymentMode: payment.paymentMode,
          referenceNo: payment.referenceNo,
        },
      });
      await notifyFeePayment(payment.id, tenant.schoolId);
      await recordAuditLog({
        actor: tenant,
        module: "FEES",
        action: "COLLECT",
        entityType: "FEE_PAYMENT",
        entityId: payment.id,
        summary: `Verified direct UPI payment ₹${Number(payment.amount).toLocaleString("en-IN")} for ${payment.studentEnrollment.student.fullName || payment.studentEnrollment.student.admissionNo}; receipt ${payment.receiptNo}.`,
        metadata: {
          source: "DIRECT_UPI_VERIFICATION",
          submissionId: result.submission.id,
          utr: result.submission.utr,
          receiptNo: payment.receiptNo,
          amount: Number(payment.amount),
        },
      });

      return ApiResponse.success(
        {
          status: result.submission.status,
          feePaymentId: payment.id,
          receiptNo: payment.receiptNo,
        },
        "UPI payment verified and fee receipt created.",
      );
    }

    await recordAuditLog({
      actor: tenant,
      module: "FEES",
      action: "UPDATE",
      entityType: "DIRECT_UPI_SUBMISSION",
      entityId: result.submission.id,
      summary: `Rejected direct UPI verification request ${result.submission.utr}.`,
      metadata: {
        source: "DIRECT_UPI_VERIFICATION",
        utr: result.submission.utr,
        reason: result.submission.rejectionReason,
      },
    });

    return ApiResponse.success(
      { status: result.submission.status },
      "UPI verification request rejected.",
    );
  });
}
