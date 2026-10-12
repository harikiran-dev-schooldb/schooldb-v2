import { NextResponse } from "next/server";

import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const results = await cashfreePaymentService.reconcileStale({ limit: 100 });
  const failed = results.filter((result) => !result.success);
  if (failed.length) {
    console.error(JSON.stringify({ event: "cashfree_reconciliation_partial_failure", failed }));
  }
  return NextResponse.json({ success: true, processed: results.length, failed: failed.length });
}
