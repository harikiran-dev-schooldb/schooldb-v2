import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"], schoolSlug);
    const rows = await prisma.cashfreePaymentOrder.findMany({
      where: {
        schoolId: tenant.schoolId,
        OR: [
          { status: { in: ["ACTIVE", "FAILED", "REVIEW_REQUIRED"] } },
          { refunds: { some: { status: { in: ["PENDING", "FAILED"] } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        providerOrderId: true,
        providerPaymentId: true,
        amount: true,
        status: true,
        failureReason: true,
        updatedAt: true,
        refunds: {
          orderBy: { createdAt: "desc" },
          select: { providerRefundId: true, amount: true, status: true, statusDescription: true, refundArn: true },
        },
      },
    });
    return ApiResponse.success(rows.map((row) => ({ ...row, amount: Number(row.amount), refunds: row.refunds.map((refund) => ({ ...refund, amount: Number(refund.amount) })) })));
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"], schoolSlug);
    const results = await cashfreePaymentService.reconcileStale({
      schoolId: tenant.schoolId,
      limit: 100,
      includeFailed: true,
    });
    return ApiResponse.success(results, `Reconciled ${results.length} Cashfree order${results.length === 1 ? "" : "s"}.`);
  });
}
