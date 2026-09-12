import { createHash, createHmac, randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import {
  createCashfreeProviderOrder,
  getCashfreeMode,
  getCashfreeOrderPayments,
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
    input: CashfreeOrderInput;
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
          enrollments: { some: { id: enrollmentId, active: true } },
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

      if (!student) throw new ApiError(404, "Active student enrollment not found.");

      const installments = await tx.studentFeeInstallment.findMany({
        where: {
          id: { in: uniqueIds },
          studentFeeItem: {
            studentFee: { schoolId, studentEnrollmentId: enrollmentId, active: true },
          },
        },
        select: { id: true, payableAmount: true, paidAmount: true },
      });

      if (installments.length !== uniqueIds.length) {
        throw new ApiError(400, "One or more selected installments are unavailable.");
      }

      const allocations = installments.map((installment) => ({
        studentFeeInstallmentId: installment.id,
        amount: money(installment.payableAmount).minus(installment.paidAmount),
      }));
      if (allocations.some((item) => item.amount.lessThanOrEqualTo(0))) {
        throw new ApiError(409, "A selected installment has already been paid.");
      }

      const amount = allocations.reduce(
        (total, item) => total.plus(item.amount),
        money(0),
      );
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
      const publicToken =
        initiator === "STAFF_QR"
          ? cashfreePublicToken(newProviderOrderId)
          : null;
      const order = await tx.cashfreePaymentOrder.create({
        data: {
          schoolId,
          studentEnrollmentId: enrollmentId,
          providerOrderId: newProviderOrderId,
          idempotencyKey: input.idempotencyKey,
          publicTokenHash: publicToken
            ? hashCashfreePublicToken(publicToken)
            : null,
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

    const publicToken =
      initiator === "STAFF_QR"
        ? cashfreePublicToken(prepared.order.providerOrderId)
        : undefined;

    if (prepared.order.status === "ACTIVE" && prepared.order.paymentSessionId) {
      const publicOrigin = callbackOrigin(requestOrigin);
      return {
        orderId: prepared.order.providerOrderId,
        paymentSessionId: prepared.order.paymentSessionId,
        amount: Number(prepared.order.amount),
        mode: getCashfreeMode(),
        ...(initiator === "STAFF_QR" && publicToken
          ? {
              publicUrl: `${publicOrigin}/pay/cashfree/${prepared.order.providerOrderId}/${publicToken}`,
            }
          : {}),
      };
    }

    if (!prepared.customer) {
      throw new ApiError(409, "This payment request can no longer be opened.");
    }

    try {
      const publicOrigin = callbackOrigin(requestOrigin);
      const returnUrl =
        initiator === "STAFF_QR" && publicToken
          ? `${publicOrigin}/pay/cashfree/${prepared.order.providerOrderId}/${publicToken}/complete`
          : `${publicOrigin}/${input.schoolSlug}/my/${input.studentId}/fees/payment/${prepared.order.providerOrderId}`;
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
        ...(initiator === "STAFF_QR" && publicToken
          ? {
              publicUrl: `${publicOrigin}/pay/cashfree/${prepared.order.providerOrderId}/${publicToken}`,
            }
          : {}),
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

    return runSerializableTransaction(async (tx) => {
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
  },
};
