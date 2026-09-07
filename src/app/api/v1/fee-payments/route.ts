import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { feePaymentSchema } from "@/features/fee-payments/schemas/fee-payment.schema";
import { feePaymentService } from "@/features/fee-payments/services/fee-payment.service";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
      "RECEPTIONIST",
    ]);
    const body = await validateBody(req, feePaymentSchema);
    const payment = await feePaymentService.create(tenant.schoolId, body);
    return ApiResponse.success(
      payment,
      "Fee payment recorded successfully.",
      201,
    );
  });
}

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const paymentMode = searchParams.get("paymentMode") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize")) || 25));

    const where: Prisma.FeePaymentWhereInput = {
      schoolId: tenant.schoolId,
      status: "SUCCESS",
      ...(paymentMode
        ? {
            paymentMode: paymentMode as
              | "CASH"
              | "UPI"
              | "CARD"
              | "BANK_TRANSFER",
          }
        : {}),
      ...(fromDate || toDate
        ? {
            paymentDate: {
              ...(fromDate
                ? { gte: new Date(`${fromDate}T00:00:00.000Z`) }
                : {}),
              ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(academicYearId ? { studentEnrollment: { academicYearId } } : {}),
      ...(search
        ? {
            OR: [
              { receiptNo: { contains: search, mode: "insensitive" } },
              {
                studentEnrollment: {
                  student: {
                    fullName: { contains: search, mode: "insensitive" },
                  },
                },
              },
              {
                studentEnrollment: {
                  student: {
                    admissionNo: { contains: search, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [payments, aggregate] = await Promise.all([
      prisma.feePayment.findMany({
        where,
        orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
        id: true,
        receiptNo: true,
        paymentDate: true,
        amount: true,
        paymentMode: true,
        referenceNo: true,
        remarks: true,
        status: true,
        studentEnrollment: {
          select: {
            student: {
              select: { id: true, fullName: true, admissionNo: true },
            },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: {
          select: { allocations: true },
        },
        },
      }),
      prisma.feePayment.aggregate({
        where,
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const rows = payments.map((payment) => ({
      id: payment.id,
      receiptNo: payment.receiptNo,
      paymentDate: payment.paymentDate,
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo,
      remarks: payment.remarks,
      status: payment.status,
      student: {
        id: payment.studentEnrollment.student.id,
        fullName: payment.studentEnrollment.student.fullName,
        admissionNo: payment.studentEnrollment.student.admissionNo,
        class: payment.studentEnrollment.class.name,
        section: payment.studentEnrollment.section.name,
      },
      allocationCount: payment._count.allocations,
    }));

    return ApiResponse.success({
      rows,
      summary: {
        paymentCount: aggregate._count._all,
        totalAmount: Number(aggregate._sum.amount ?? 0),
      },
      pagination: {
        page,
        pageSize,
        total: aggregate._count._all,
        totalPages: Math.max(1, Math.ceil(aggregate._count._all / pageSize)),
      },
    });
  });
}
