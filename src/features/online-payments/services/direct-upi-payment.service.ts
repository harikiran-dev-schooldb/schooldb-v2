import { Prisma } from "@/generated/prisma/client";
import { createFeePaymentInTransaction } from "@/features/fee-payments/repositories/fee-payment.repository";
import { findInstallmentSequenceViolation } from "@/features/fee-payments/installment-sequence";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import {
  isValidUpiId,
  isValidUpiReference,
  normalizeUpiReference,
} from "../direct-upi";

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export const directUpiPaymentService = {
  async submit({
    schoolId,
    enrollmentId,
    submittedByUserId,
    installmentIds,
    utr,
  }: {
    schoolId: string;
    enrollmentId: string;
    submittedByUserId: string;
    installmentIds: string[];
    utr: string;
  }) {
    const normalizedUtr = normalizeUpiReference(utr);
    if (!isValidUpiReference(normalizedUtr)) {
      throw new ApiError(
        400,
        "Enter a valid UPI UTR / transaction reference.",
      );
    }

    return runSerializableTransaction(async (tx) => {
      const school = await tx.school.findUnique({
        where: { id: schoolId },
        select: {
          directUpiEnabled: true,
          directUpiId: true,
        },
      });
      if (
        !school?.directUpiEnabled ||
        !school.directUpiId ||
        !isValidUpiId(school.directUpiId)
      ) {
        throw new ApiError(409, "Direct UPI is not enabled for this school.");
      }

      const enrollment = await tx.studentEnrollment.findFirst({
        where: {
          id: enrollmentId,
          schoolId,
          student: { status: { in: ["ACTIVE", "ALUMNI"] } },
        },
        select: { id: true },
      });
      if (!enrollment) {
        throw new ApiError(404, "Active or alumni student enrollment not found.");
      }

      const duplicateUtr = await tx.directUpiPaymentSubmission.findFirst({
        where: { schoolId, utr: normalizedUtr },
        select: { id: true, status: true },
      });
      if (duplicateUtr) {
        throw new ApiError(
          409,
          `This UTR has already been submitted (${duplicateUtr.status.toLowerCase()}).`,
        );
      }

      const uniqueIds = [...new Set(installmentIds)];
      if (uniqueIds.length !== installmentIds.length) {
        throw new ApiError(400, "Each installment can be selected only once.");
      }

      const pendingOverlap = await tx.directUpiPaymentSubmission.findFirst({
        where: {
          schoolId,
          studentEnrollmentId: enrollmentId,
          status: "PENDING",
          allocations: {
            some: { studentFeeInstallmentId: { in: uniqueIds } },
          },
        },
        select: { id: true },
      });
      if (pendingOverlap) {
        throw new ApiError(
          409,
          "A selected installment is already awaiting UPI verification.",
        );
      }

      const installments = await tx.studentFeeInstallment.findMany({
        where: {
          id: { in: uniqueIds },
          studentFeeItem: {
            studentFee: {
              schoolId,
              studentEnrollmentId: enrollmentId,
              active: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          sequence: true,
          payableAmount: true,
          paidAmount: true,
          status: true,
          studentFeeItem: { select: { studentFeeId: true } },
        },
      });

      if (installments.length !== uniqueIds.length) {
        throw new ApiError(
          400,
          "One or more selected installments are unavailable.",
        );
      }

      const allocations = installments.map((installment) => ({
        studentFeeInstallmentId: installment.id,
        amount: money(installment.payableAmount).minus(installment.paidAmount),
      }));

      if (allocations.some((item) => item.amount.lessThanOrEqualTo(0))) {
        throw new ApiError(409, "A selected installment has already been paid.");
      }

      const studentFeeIds = [
        ...new Set(
          installments.map(
            (installment) => installment.studentFeeItem.studentFeeId,
          ),
        ),
      ];
      const sequencedInstallments = await tx.studentFeeInstallment.findMany({
        where: {
          studentFeeItem: { studentFeeId: { in: studentFeeIds } },
        },
        select: {
          id: true,
          name: true,
          sequence: true,
          payableAmount: true,
          paidAmount: true,
          status: true,
          studentFeeItem: { select: { studentFeeId: true } },
        },
      });

      const sequenceViolation = findInstallmentSequenceViolation(
        sequencedInstallments.map((installment) => ({
          id: installment.id,
          name: installment.name,
          studentFeeId: installment.studentFeeItem.studentFeeId,
          sequence: installment.sequence,
          payableAmount: Number(installment.payableAmount),
          paidAmount: Number(installment.paidAmount),
          status: installment.status,
        })),
        allocations.map((allocation) => ({
          studentFeeInstallmentId: allocation.studentFeeInstallmentId,
          amount: Number(allocation.amount),
        })),
      );
      if (sequenceViolation) {
        throw new ApiError(
          400,
          `Pay ${sequenceViolation.blockingInstallmentName} in full before paying ${sequenceViolation.installmentName}.`,
        );
      }

      const amount = allocations.reduce(
        (total, item) => total.plus(item.amount),
        money(0),
      );

      return tx.directUpiPaymentSubmission.create({
        data: {
          schoolId,
          studentEnrollmentId: enrollmentId,
          submittedByUserId,
          utr: normalizedUtr,
          amount,
          allocations: {
            create: allocations,
          },
        },
        select: {
          id: true,
          utr: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      });
    });
  },

  async review({
    schoolId,
    submissionId,
    reviewedByUserId,
    action,
    reason,
  }: {
    schoolId: string;
    submissionId: string;
    reviewedByUserId: string;
    action: "APPROVE" | "REJECT";
    reason?: string;
  }) {
    return runSerializableTransaction(async (tx) => {
      const submission = await tx.directUpiPaymentSubmission.findFirst({
        where: { id: submissionId, schoolId },
        include: {
          allocations: true,
          studentEnrollment: {
            include: {
              student: true,
              class: true,
              section: true,
              academicYear: true,
            },
          },
        },
      });

      if (!submission) {
        throw new ApiError(404, "UPI verification request not found.");
      }
      if (submission.status !== "PENDING") {
        throw new ApiError(
          409,
          `This request is already ${submission.status.toLowerCase()}.`,
        );
      }

      if (action === "REJECT") {
        const rejectionReason = reason?.trim();
        if (!rejectionReason) {
          throw new ApiError(400, "Enter a reason for rejecting this payment.");
        }
        const rejected = await tx.directUpiPaymentSubmission.update({
          where: { id: submission.id },
          data: {
            status: "REJECTED",
            rejectionReason,
            reviewedByUserId,
            reviewedAt: new Date(),
          },
        });
        return { submission: rejected, payment: null };
      }

      const payment = await createFeePaymentInTransaction(tx, schoolId, {
        studentEnrollmentId: submission.studentEnrollmentId,
        allocations: submission.allocations.map((allocation) => ({
          studentFeeInstallmentId: allocation.studentFeeInstallmentId,
          amount: Number(allocation.amount),
        })),
        paymentDate: submission.createdAt.toISOString().slice(0, 10),
        paymentMode: "UPI",
        referenceNo: submission.utr,
        remarks: "Direct UPI payment verified by school.",
      });

      const approved = await tx.directUpiPaymentSubmission.update({
        where: { id: submission.id },
        data: {
          status: "APPROVED",
          rejectionReason: null,
          reviewedByUserId,
          reviewedAt: new Date(),
          feePaymentId: payment.id,
        },
      });

      return { submission: approved, payment };
    });
  },

  async listForReview(schoolId: string) {
    const rows = await prisma.directUpiPaymentSubmission.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        allocations: {
          include: {
            studentFeeInstallment: {
              select: {
                name: true,
                studentFeeItem: {
                  select: {
                    feeCategory: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        studentEnrollment: {
          select: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                fullName: true,
              },
            },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        reviewedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        feePayment: {
          select: {
            id: true,
            receiptNo: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      utr: row.utr,
      amount: Number(row.amount),
      status: row.status,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      student: {
        id: row.studentEnrollment.student.id,
        admissionNo: row.studentEnrollment.student.admissionNo,
        fullName: row.studentEnrollment.student.fullName,
        class: row.studentEnrollment.class.name,
        section: row.studentEnrollment.section.name,
      },
      installments: row.allocations.map((allocation) => ({
        id: allocation.studentFeeInstallmentId,
        name: allocation.studentFeeInstallment.name,
        category:
          allocation.studentFeeInstallment.studentFeeItem.feeCategory.name,
        amount: Number(allocation.amount),
      })),
      reviewedBy: row.reviewedBy
        ? [row.reviewedBy.firstName, row.reviewedBy.lastName]
            .filter(Boolean)
            .join(" ") || row.reviewedBy.email
        : null,
      receiptNo: row.feePayment?.receiptNo ?? null,
      feePaymentId: row.feePayment?.id ?? null,
    }));
  },

  async listForStudent(schoolId: string, enrollmentId: string) {
    const rows = await prisma.directUpiPaymentSubmission.findMany({
      where: { schoolId, studentEnrollmentId: enrollmentId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        utr: true,
        amount: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        allocations: {
          select: {
            studentFeeInstallmentId: true,
          },
        },
        feePayment: {
          select: {
            id: true,
            receiptNo: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      utr: row.utr,
      amount: Number(row.amount),
      status: row.status,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt.toISOString(),
      installmentIds: row.allocations.map(
        (allocation) => allocation.studentFeeInstallmentId,
      ),
      receiptNo: row.feePayment?.receiptNo ?? null,
      feePaymentId: row.feePayment?.id ?? null,
    }));
  },
};
