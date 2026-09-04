import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { feePaymentSchema } from "@/features/fee-payments/schemas/fee-payment.schema";
import { feePaymentService } from "@/features/fee-payments/services/fee-payment.service";
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

    const payments = await prisma.feePayment.findMany({
      where: {
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
      },
      orderBy: { paymentDate: "desc" },
      include: {
        studentEnrollment: {
          include: { student: true, class: true, section: true },
        },
        allocations: true,
      },
    });

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
      allocationCount: payment.allocations.length,
    }));

    return ApiResponse.success({
      rows,
      summary: {
        paymentCount: rows.length,
        totalAmount: rows.reduce((sum, payment) => sum + payment.amount, 0),
      },
    });
  });
}
