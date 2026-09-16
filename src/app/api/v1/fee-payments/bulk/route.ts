import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import {
  importBulkFeePayments,
  type BulkFeePaymentRow,
} from "@/features/fees/services/bulk-fee-payment.service";

const MAX_BATCH_SIZE = 100;

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

    const body = (await req.json()) as {
      payments?: BulkFeePaymentRow[];
    };

    const payments = Array.isArray(body.payments) ? body.payments : [];

    /*
     * -----------------------------------------------------
     * Batch validation
     * -----------------------------------------------------
     */

    if (!payments.length) {
      return ApiResponse.error("At least one payment row is required.", 400);
    }

    if (payments.length > MAX_BATCH_SIZE) {
      return ApiResponse.error(
        `Maximum ${MAX_BATCH_SIZE} payment rows can be imported per batch.`,
        400,
      );
    }

    /*
     * -----------------------------------------------------
     * Validate every payment row
     * -----------------------------------------------------
     *
     * Required:
     *
     * admissionNo
     * installmentName
     * paymentDate
     * amount
     * paymentMode
     *
     * Optional:
     *
     * referenceNo
     * remarks
     */

    const invalid = payments.findIndex(
      (payment) =>
        !payment.admissionNo?.trim() ||
        !payment.installmentName?.trim() ||
        !payment.paymentDate?.trim() ||
        !Number.isFinite(payment.amount) ||
        payment.amount <= 0 ||
        !PAYMENT_MODES.has(payment.paymentMode),
    );

    if (invalid >= 0) {
      return ApiResponse.error(
        `Row ${
          invalid + 2
        }: admissionNo, installmentName, paymentDate, amount, and a valid paymentMode are required.`,
        400,
      );
    }

    /*
     * -----------------------------------------------------
     * Import payments
     * -----------------------------------------------------
     */

    const result = await importBulkFeePayments(tenant.schoolId, payments);

    /*
     * -----------------------------------------------------
     * Response
     * -----------------------------------------------------
     */

    return ApiResponse.success(
      result,

      result.failed > 0
        ? `${result.created} payments imported. ${result.failed} rows failed.`
        : `${result.created} fee payments imported successfully.`,
    );
  });
}
