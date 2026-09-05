import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  importBulkFeePayments,
  type BulkFeePaymentRow,
} from "@/features/fees/services/bulk-fee-payment.service";

const PAYMENT_MODES = new Set([
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
]);

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await req.json()) as { payments?: BulkFeePaymentRow[] };
    const payments = body.payments ?? [];

    if (!Array.isArray(payments) || payments.length === 0) {
      return ApiResponse.error("At least one payment row is required.", 400);
    }

    if (payments.length > 1000) {
      return ApiResponse.error(
        "Maximum 1,000 payment rows can be imported at once.",
        400,
      );
    }

    const invalid = payments.findIndex(
      (payment) =>
        !payment.admissionNo?.trim() ||
        !payment.paymentDate?.trim() ||
        !PAYMENT_MODES.has(payment.paymentMode),
    );

    if (invalid >= 0) {
      return ApiResponse.error(
        `Row ${invalid + 2}: admissionNo, paymentDate, and a valid paymentMode are required.`,
        400,
      );
    }

    const result = await importBulkFeePayments(tenant.schoolId, payments);

    return ApiResponse.success(
      result,
      result.failed
        ? "Bulk fee payment import completed with some errors."
        : "Bulk fee payments imported successfully.",
    );
  });
}
