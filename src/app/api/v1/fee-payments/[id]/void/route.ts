import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { z } from "zod";

import { feePaymentService } from "@/features/fee-payments/services/fee-payment.service";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { studentActivityService } from "@/features/students/services/student-activity.service";

type Params = { params: Promise<{ id: string }> };

const voidPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Void reason must be at least 3 characters.")
    .max(500, "Void reason is too long."),
});

export async function POST(req: Request, { params }: Params) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
    ]);
    const { id } = await params;
    const body = await req.json();
    const { reason } = voidPaymentSchema.parse(body);
    const payment = await feePaymentService.void(
      tenant.schoolId,
      id,
      reason,
      tenant.userId,
    );
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: payment.studentEnrollmentId },
      select: { id: true, studentId: true },
    });
    if (enrollment) {
      await studentActivityService.create({
        schoolId: tenant.schoolId,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        performedByUserId: tenant.userId,
        type: "FEE_PAYMENT_VOIDED",
        title: "Fee payment voided",
        description: `${payment.receiptNo}: ${reason}`,
        sourceType: "FEE_PAYMENT_VOID",
        sourceId: payment.id,
        metadata: { receiptNo: payment.receiptNo, reason },
      });
    }
    await recordAuditLog({
      actor: tenant,
      module: "FEES",
      action: "VOID",
      entityType: "FEE_PAYMENT",
      entityId: id,
      summary: `Voided fee payment${payment.receiptNo ? ` ${payment.receiptNo}` : ""}.`,
      metadata: { reason },
    });
    return ApiResponse.success(null, "Payment voided successfully.");
  });
}
