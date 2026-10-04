import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const concessionSchema = z.object({
  concession: z.coerce.number().min(0),
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
    ]);

    const { id } = await params;

    const body = await req.json();

    const { concession } = concessionSchema.parse(body);

    const installment = await prisma.studentFeeInstallment.findFirst({
      where: {
        id,
        studentFeeItem: {
          studentFee: {
            schoolId: tenant.schoolId,
          },
        },
      },
      include: {
        studentFeeItem: {
          include: {
            studentFee: { include: { studentEnrollment: true } },
          },
        },
      },
    });

    if (!installment) {
      return ApiResponse.error("Student fee installment not found.", 404);
    }

    const amount = Number(installment.amount);
    const paidAmount = Number(installment.paidAmount);
    const hasRteWaiver = Number(installment.rteWaiver) > 0;

    if (concession > amount) {
      throw new Error(
        "Concession cannot be greater than the installment amount.",
      );
    }

    const rteWaiver = hasRteWaiver ? Math.max(amount - concession, 0) : 0;
    const payableAmount = Math.max(amount - rteWaiver - concession, 0);

    if (paidAmount > payableAmount) {
      throw new Error(
        "Concession cannot make the payable amount less than the amount already paid.",
      );
    }

    let status: "PENDING" | "PARTIAL" | "PAID" | "WAIVED";

    if (payableAmount === 0) {
      status = "WAIVED";
    } else if (paidAmount >= payableAmount) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    } else {
      status = "PENDING";
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.studentFeeInstallment.update({
        where: { id },
        data: { concession, rteWaiver, payableAmount, status },
      });
      const itemTotals = await tx.studentFeeInstallment.aggregate({
        where: { studentFeeItemId: installment.studentFeeItemId },
        _sum: { concession: true, rteWaiver: true, payableAmount: true },
      });
      await tx.studentFeeItem.update({
        where: { id: installment.studentFeeItemId },
        data: {
          concession: itemTotals._sum.concession ?? 0,
          rteWaiver: itemTotals._sum.rteWaiver ?? 0,
          finalAmount: itemTotals._sum.payableAmount ?? 0,
        },
      });
      const enrollment = installment.studentFeeItem.studentFee.studentEnrollment;
      await tx.studentActivity.create({
        data: {
          schoolId: tenant.schoolId,
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          performedByUserId: tenant.userId,
          type: "FEE_CONCESSION",
          title: "Fee concession updated",
          description: `${installment.name}: ₹${Number(installment.concession).toLocaleString("en-IN")} → ₹${concession.toLocaleString("en-IN")}.`,
          sourceType: "FEE_INSTALLMENT_CONCESSION",
          sourceId: `${id}:${Date.now()}`,
          metadata: { installmentId: id, previousConcession: Number(installment.concession), concession },
        },
      });
      return saved;
    });

    return ApiResponse.success(updated, "Concession updated successfully.");
  });
}
