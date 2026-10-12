import { createHash, createHmac, randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import { findInstallmentSequenceViolation } from "@/features/fee-payments/installment-sequence";
import { feePaymentService } from "@/features/fee-payments/services/fee-payment.service";
import { notifyFeePayment } from "@/features/notifications/events";
import {
  allocateCashfreeAmount,
  CashfreeAmountError,
} from "../cashfree-allocation";
import {
  createCashfreeProviderOrder,
  createCashfreeRefund,
  getCashfreeMode,
  getCashfreeOrderPayments,
  getCashfreeOrderRefunds,
  getCashfreeProviderOrder,
  getCashfreeSecretKey,
} from "../cashfree";
import type { CashfreeOrderInput } from "../schemas/cashfree-order.schema";

function normalizedIndianPhone(values: Array<string | null | undefined>) {
  for (const value of values) {
    const digits = value?.replace(/\D/g, "") ?? "";
    const phone = digits.length > 10 ? digits.slice(-10) : digits;
    if (/^[6-9]\d{9}$/.test(phone)) return phone;
  }
  return null;
}

function providerOrderId() {
  return `SDB-${Date.now()}-${randomBytes(5).toString("hex")}`;
}

function receiptNo() {
  return `FEE-${Date.now()}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function callbackOrigin(requestOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const origin = configured || requestOrigin;

  try {
    const url = new URL(origin);
    if (getCashfreeMode() === "production" && url.protocol !== "https:") {
      throw new Error("HTTPS is required");
    }
    return url.origin;
  } catch {
    throw new ApiError(503, "The payment callback URL is not configured correctly.");
  }
}

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export function hashCashfreePublicToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cashfreePublicToken(orderId: string) {
  return createHmac("sha256", getCashfreeSecretKey())
    .update(`schooldb-staff-qr:${orderId}`)
    .digest("base64url");
}

function providerRefundId() {
  return `SDB-REF-${Date.now()}-${randomBytes(5).toString("hex")}`;
}

function refundStatus(value: string) {
  if (value === "SUCCESS") return "SUCCESS" as const;
  if (value === "CANCELLED") return "CANCELLED" as const;
  if (value === "FAILED") return "FAILED" as const;
  return "PENDING" as const;
}

async function applyProviderRefund(
  order: {
    id: string;
    schoolId: string;
    feePaymentId: string | null;
  },
  provider: {
    refund_id: string;
    cf_refund_id?: string;
    refund_status: string;
    status_description?: string;
    refund_arn?: string;
    processed_at?: string;
  },
) {
  const status = refundStatus(provider.refund_status);
  const refund = await prisma.cashfreeRefund.update({
    where: { providerRefundId: provider.refund_id },
    data: {
      status,
      cashfreeRefundId: provider.cf_refund_id || undefined,
      statusDescription: provider.status_description?.slice(0, 500) || null,
      refundArn: provider.refund_arn || null,
      processedAt: provider.processed_at ? new Date(provider.processed_at) : status === "SUCCESS" ? new Date() : null,
      lastReconciledAt: new Date(),
    },
  });

  if (status === "SUCCESS" && order.feePaymentId) {
    const payment = await prisma.feePayment.findUnique({
      where: { id: order.feePaymentId },
      select: {
        status: true,
        receiptNo: true,
        studentEnrollment: { select: { id: true, studentId: true } },
      },
    });
    if (payment?.status === "SUCCESS") {
      await feePaymentService.refund(
        order.schoolId,
        order.feePaymentId,
        refund.reason,
        refund.initiatedByUserId,
      );
      try {
        await prisma.studentActivity.create({
          data: {
            schoolId: order.schoolId,
            studentId: payment.studentEnrollment.studentId,
            enrollmentId: payment.studentEnrollment.id,
            performedByUserId: refund.initiatedByUserId,
            type: "FEE_PAYMENT_REFUNDED",
            title: "Online fee payment refunded",
            description: `${payment.receiptNo}: ${refund.reason}`,
            sourceType: "CASHFREE_REFUND",
            sourceId: refund.id,
            metadata: {
              receiptNo: payment.receiptNo,
              refundId: refund.providerRefundId,
              refundArn: refund.refundArn,
              amount: Number(refund.amount),
            },
          },
        });
      } catch (error) {
        console.error("Cashfree refund activity write failed", error);
      }
    }
  }

  return refund;
}

export const cashfreePaymentService = {
  async createOrder({
    input,
    schoolId,
    enrollmentId,
    requestedByUserId,
    requestOrigin,
    userEmail,
    userPhone,
    initiator = "SELF_SERVICE",
  }: {
    input: CashfreeOrderInput & { amount?: number };
    schoolId: string;
    enrollmentId: string;
    requestedByUserId: string;
    requestOrigin: string;
    userEmail?: string | null;
    userPhone?: string | null;
    initiator?: "SELF_SERVICE" | "STAFF_QR";
  }) {
    const prepared = await runSerializableTransaction(async (tx) => {
      const existing = await tx.cashfreePaymentOrder.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) {
        if (
          existing.schoolId !== schoolId ||
          existing.studentEnrollmentId !== enrollmentId ||
          existing.requestedByUserId !== requestedByUserId ||
          existing.initiatedBy !== initiator
        ) {
          throw new ApiError(409, "This payment request cannot be reused.");
        }
        if (input.amount !== undefined && !money(input.amount).equals(existing.amount)) {
          throw new ApiError(409, "This payment request was already created for a different amount.");
        }
        return { order: existing, customer: null };
      }

      const uniqueIds = [...new Set(input.installmentIds)];
      if (uniqueIds.length !== input.installmentIds.length) {
        throw new ApiError(400, "Each installment can be selected only once.");
      }

      if (initiator === "STAFF_QR") {
        const activeOrders = await tx.cashfreePaymentOrder.findMany({
          where: {
            schoolId,
            studentEnrollmentId: enrollmentId,
            initiatedBy: "STAFF_QR",
            status: "ACTIVE",
            paymentSessionId: { not: null },
            allocations: {
              some: { studentFeeInstallmentId: { in: uniqueIds } },
            },
          },
          include: {
            allocations: { select: { studentFeeInstallmentId: true } },
          },
        });
        const requested = new Set(uniqueIds);
        const exactMatch = activeOrders.find(
          (order) =>
            order.allocations.length === requested.size &&
            (input.amount === undefined || money(input.amount).equals(order.amount)) &&
            order.allocations.every((item) =>
              requested.has(item.studentFeeInstallmentId),
            ),
        );

        if (exactMatch) return { order: exactMatch, customer: null };
        if (activeOrders.length) {
          throw new ApiError(
            409,
            "An active payment QR already includes one of these installments. Reopen that selection or wait for it to expire.",
          );
        }
      }

      const student = await tx.student.findFirst({
        where: {
          id: input.studentId,
          schoolId,
          status: { in: ["ACTIVE", "ALUMNI"] },
          enrollments: { some: { id: enrollmentId } },
        },
        select: {
          fullName: true,
          admissionNo: true,
          email: true,
          fatherEmail: true,
          motherEmail: true,
          phone: true,
          fatherPhone: true,
          motherPhone: true,
          guardianPhone: true,
          alternatePhone: true,
        },
      });

      if (!student) throw new ApiError(404, "Active or alumni student enrollment not found.");

      const installments = await tx.studentFeeInstallment.findMany({
        where: {
          id: { in: uniqueIds },
          studentFeeItem: {
            studentFee: { schoolId, studentEnrollmentId: enrollmentId, active: true },
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
        throw new ApiError(400, "One or more selected installments are unavailable.");
      }

      const installmentsById = new Map(
        installments.map((installment) => [installment.id, installment]),
      );
      const orderedInstallments = uniqueIds.map((id) => installmentsById.get(id)!);
      const outstanding = orderedInstallments.map((installment) => ({
        id: installment.id,
        outstanding: Number(
          money(installment.payableAmount).minus(installment.paidAmount),
        ),
      }));
      if (outstanding.some((item) => item.outstanding <= 0)) {
        throw new ApiError(409, "A selected installment has already been paid.");
      }

      let allocationResult;
      try {
        const maximumAmount = outstanding.reduce(
          (total, installment) => total + installment.outstanding,
          0,
        );
        allocationResult = allocateCashfreeAmount(
          outstanding,
          input.amount ?? maximumAmount,
        );
      } catch (error) {
        if (error instanceof CashfreeAmountError) {
          throw new ApiError(400, error.message);
        }
        throw error;
      }
      const allocations = allocationResult.allocations.map((allocation) => ({
        studentFeeInstallmentId: allocation.studentFeeInstallmentId,
        amount: money(allocation.amount),
      }));

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

      const amount = money(allocationResult.amount);
      if (amount.lessThan(1)) {
        throw new ApiError(400, "The online payment total must be at least ₹1.");
      }

      const phone = normalizedIndianPhone([
        input.customerPhone,
        student.phone,
        student.fatherPhone,
        student.motherPhone,
        student.guardianPhone,
        student.alternatePhone,
        userPhone,
      ]);
      if (!phone) {
        throw new ApiError(
          400,
          "Add a valid 10-digit mobile number to the student or parent profile before paying online.",
        );
      }

      const newProviderOrderId = providerOrderId();
      const publicToken = cashfreePublicToken(newProviderOrderId);
      const order = await tx.cashfreePaymentOrder.create({
        data: {
          schoolId,
          studentEnrollmentId: enrollmentId,
          providerOrderId: newProviderOrderId,
          idempotencyKey: input.idempotencyKey,
          publicTokenHash: hashCashfreePublicToken(publicToken),
          amount,
          initiatedBy: initiator,
          requestedByUserId,
          allocations: { create: allocations },
        },
      });

      return {
        order,
        customer: {
          name: student.fullName || student.admissionNo,
          phone,
          email: student.email || student.fatherEmail || student.motherEmail || userEmail,
          admissionNo: student.admissionNo,
        },
      };
    });

    const publicToken = cashfreePublicToken(prepared.order.providerOrderId);

    if (prepared.order.status === "ACTIVE" && prepared.order.paymentSessionId) {
      const publicOrigin = callbackOrigin(requestOrigin);
      return {
        orderId: prepared.order.providerOrderId,
        paymentSessionId: prepared.order.paymentSessionId,
        amount: Number(prepared.order.amount),
        mode: getCashfreeMode(),
        publicUrl: `${publicOrigin}/pay/cashfree/${prepared.order.providerOrderId}/${publicToken}`,
      };
    }

    if (!prepared.customer) {
      throw new ApiError(409, "This payment request can no longer be opened.");
    }

    try {
      const publicOrigin = callbackOrigin(requestOrigin);
      const returnUrl = `${publicOrigin}/pay/cashfree/${prepared.order.providerOrderId}/${publicToken}/complete`;
      const notifyUrl = `${publicOrigin}/api/v1/public/payments/cashfree/webhook`;
      const provider = await createCashfreeProviderOrder({
        orderId: prepared.order.providerOrderId,
        amount: Number(prepared.order.amount),
        customerId: `student_${input.studentId}`,
        customerName: prepared.customer.name,
        customerPhone: prepared.customer.phone,
        customerEmail: prepared.customer.email || undefined,
        returnUrl,
        notifyUrl,
        idempotencyKey: input.idempotencyKey,
      });

      if (!provider.payment_session_id) {
        throw new ApiError(502, "Cashfree did not return a checkout session.");
      }

      await prisma.cashfreePaymentOrder.update({
        where: { id: prepared.order.id },
        data: { status: "ACTIVE", paymentSessionId: provider.payment_session_id },
      });

      return {
        orderId: prepared.order.providerOrderId,
        paymentSessionId: provider.payment_session_id,
        amount: Number(prepared.order.amount),
        mode: getCashfreeMode(),
        publicUrl: `${publicOrigin}/pay/cashfree/${prepared.order.providerOrderId}/${publicToken}`,
      };
    } catch (error) {
      await prisma.cashfreePaymentOrder.update({
        where: { id: prepared.order.id },
        data: {
          status: "FAILED",
          failureReason:
            error instanceof Error ? error.message.slice(0, 500) : "Cashfree order failed",
        },
      });
      throw error;
    }
  },

  async verifyAndSettle(providerOrderIdValue: string, webhookPaymentId?: string) {
    const localOrder = await prisma.cashfreePaymentOrder.findUnique({
      where: { providerOrderId: providerOrderIdValue },
    });
    if (!localOrder) throw new ApiError(404, "Payment order not found.");
    if (localOrder.feePaymentId) return localOrder;

    const provider = await getCashfreeProviderOrder(providerOrderIdValue);
    if (!money(provider.order_amount).equals(localOrder.amount)) {
      await prisma.cashfreePaymentOrder.update({
        where: { id: localOrder.id },
        data: { status: "REVIEW_REQUIRED", failureReason: "Provider amount mismatch" },
      });
      throw new ApiError(409, "Payment requires manual review.");
    }

    if (provider.order_status !== "PAID") {
      const terminal = provider.order_status === "EXPIRED" || provider.order_status === "TERMINATED";
      if (terminal) {
        await prisma.cashfreePaymentOrder.update({
          where: { id: localOrder.id },
          data: { status: "EXPIRED" },
        });
      }
      return prisma.cashfreePaymentOrder.findUniqueOrThrow({
        where: { id: localOrder.id },
      });
    }

    const payments = await getCashfreeOrderPayments(providerOrderIdValue);
    const successful = payments.find((payment) => payment.payment_status === "SUCCESS");
    const paymentReference =
      successful?.cf_payment_id?.toString() || webhookPaymentId || providerOrderIdValue;

    const settledOrder = await runSerializableTransaction(async (tx) => {
      const order = await tx.cashfreePaymentOrder.findUniqueOrThrow({
        where: { id: localOrder.id },
        include: {
          allocations: { include: { studentFeeInstallment: true } },
        },
      });
      if (order.feePaymentId) return order;

      const changedBalance = order.allocations.some((allocation) => {
        const installment = allocation.studentFeeInstallment;
        const balance = money(installment.payableAmount).minus(installment.paidAmount);
        return !balance.equals(allocation.amount);
      });
      if (changedBalance) {
        return tx.cashfreePaymentOrder.update({
          where: { id: order.id },
          data: {
            status: "REVIEW_REQUIRED",
            providerPaymentId: paymentReference,
            failureReason: "Fee balance changed after checkout started",
          },
        });
      }

      const payment = await tx.feePayment.create({
        data: {
          schoolId: order.schoolId,
          studentEnrollmentId: order.studentEnrollmentId,
          receiptNo: receiptNo(),
          paymentDate: new Date(),
          amount: order.amount,
          paymentMode: "ONLINE",
          referenceNo: paymentReference,
          remarks: `Cashfree order ${order.providerOrderId}`,
          status: "SUCCESS",
          allocations: {
            create: order.allocations.map((allocation) => ({
              studentFeeInstallmentId: allocation.studentFeeInstallmentId,
              amount: allocation.amount,
            })),
          },
        },
      });

      const enrollment = await tx.studentEnrollment.findUniqueOrThrow({
        where: { id: order.studentEnrollmentId },
        select: { id: true, studentId: true },
      });
      await tx.studentActivity.create({
        data: {
          schoolId: order.schoolId,
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          type: "FEE_PAYMENT",
          title: "Online fee payment received",
          description: `₹${Number(order.amount).toLocaleString("en-IN")} received online. Receipt: ${payment.receiptNo}.`,
          sourceType: "FEE_PAYMENT",
          sourceId: payment.id,
          metadata: { receiptNo: payment.receiptNo, amount: Number(order.amount), paymentMode: "ONLINE" },
        },
      });

      for (const allocation of order.allocations) {
        const installment = allocation.studentFeeInstallment;
        const paidAmount = money(installment.paidAmount).plus(allocation.amount);
        await tx.studentFeeInstallment.update({
          where: { id: installment.id },
          data: {
            paidAmount,
            status: paidAmount.greaterThanOrEqualTo(installment.payableAmount)
              ? "PAID"
              : "PARTIAL",
          },
        });
      }

      return tx.cashfreePaymentOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          providerPaymentId: paymentReference,
          feePaymentId: payment.id,
          paidAt: new Date(),
          failureReason: null,
        },
      });
    });

    if (settledOrder.feePaymentId) {
      try {
        await notifyFeePayment(settledOrder.feePaymentId, settledOrder.schoolId);
      } catch (error) {
        // Payment settlement must remain successful even if a non-critical
        // notification provider is temporarily unavailable.
        console.error("Cashfree payment notification failed", error);
      }
    }

    return settledOrder;
  },

  async initiateRefund({
    schoolId,
    feePaymentId,
    reason,
    initiatedByUserId,
  }: {
    schoolId: string;
    feePaymentId: string;
    reason: string;
    initiatedByUserId: string;
  }) {
    const order = await prisma.cashfreePaymentOrder.findFirst({
      where: { schoolId, feePaymentId, status: "PAID" },
      include: { refunds: { orderBy: { createdAt: "desc" } } },
    });
    if (!order) throw new ApiError(404, "Cashfree payment order not found.");

    const completed = order.refunds.find((refund) => refund.status === "SUCCESS");
    if (completed) return completed;

    let refund = order.refunds.find((item) => item.status === "PENDING");
    if (!refund) {
      refund = await prisma.cashfreeRefund.create({
        data: {
          schoolId,
          orderId: order.id,
          feePaymentId,
          providerRefundId: providerRefundId(),
          amount: order.amount,
          reason,
          initiatedByUserId,
        },
      });
    }

    try {
      const provider = await createCashfreeRefund({
        orderId: order.providerOrderId,
        refundId: refund.providerRefundId,
        amount: Number(refund.amount),
        note: refund.reason,
      });
      return applyProviderRefund(order, provider);
    } catch (error) {
      await prisma.cashfreeRefund.update({
        where: { id: refund.id },
        data: {
          statusDescription: error instanceof Error ? error.message.slice(0, 500) : "Refund request failed",
          lastReconciledAt: new Date(),
        },
      });
      throw error;
    }
  },

  async reconcileOrder(providerOrderIdValue: string) {
    const order = await this.verifyAndSettle(providerOrderIdValue);
    const providerRefunds = await getCashfreeOrderRefunds(providerOrderIdValue);
    const matchedRefundIds = new Set<string>();
    for (const provider of providerRefunds) {
      matchedRefundIds.add(provider.refund_id);
      const local = await prisma.cashfreeRefund.findUnique({
        where: { providerRefundId: provider.refund_id },
        select: { id: true },
      });
      if (local) await applyProviderRefund(order, provider);
    }

    const pendingLocalRefunds = await prisma.cashfreeRefund.findMany({
      where: { orderId: order.id, status: "PENDING" },
    });
    for (const refund of pendingLocalRefunds) {
      if (matchedRefundIds.has(refund.providerRefundId)) continue;
      const provider = await createCashfreeRefund({
        orderId: order.providerOrderId,
        refundId: refund.providerRefundId,
        amount: Number(refund.amount),
        note: refund.reason,
      });
      await applyProviderRefund(order, provider);
    }
    return prisma.cashfreePaymentOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { refunds: { orderBy: { createdAt: "desc" } } },
    });
  },

  async reconcileStale({
    schoolId,
    limit = 50,
    includeFailed = false,
  }: { schoolId?: string; limit?: number; includeFailed?: boolean } = {}) {
    const cutoff = new Date(Date.now() - 5 * 60 * 1_000);
    const orders = await prisma.cashfreePaymentOrder.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        OR: [
          { status: { in: includeFailed ? ["ACTIVE", "FAILED", "REVIEW_REQUIRED"] : ["ACTIVE", "REVIEW_REQUIRED"] }, updatedAt: { lte: cutoff } },
          { refunds: { some: { status: "PENDING", updatedAt: { lte: cutoff } } } },
        ],
      },
      orderBy: { updatedAt: "asc" },
      take: Math.min(Math.max(limit, 1), 100),
      select: { providerOrderId: true },
    });

    const results = [];
    for (const order of orders) {
      try {
        await this.reconcileOrder(order.providerOrderId);
        results.push({ orderId: order.providerOrderId, success: true });
      } catch (error) {
        results.push({
          orderId: order.providerOrderId,
          success: false,
          message: error instanceof Error ? error.message : "Reconciliation failed",
        });
      }
    }
    return results;
  },
};
