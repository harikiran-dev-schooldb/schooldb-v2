import { NextResponse } from "next/server";

import { getCashfreeSecretKey } from "@/features/online-payments/cashfree";
import { verifyCashfreeWebhookSignature } from "@/features/online-payments/cashfree-signature";
import { cashfreePaymentService } from "@/features/online-payments/services/cashfree-payment.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WebhookPayload = {
  type?: string;
  data?: {
    order?: { order_id?: string };
    payment?: { cf_payment_id?: number | string; payment_status?: string };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature") ?? "";

  if (
    !timestamp ||
    !signature ||
    !verifyCashfreeWebhookSignature({
      rawBody,
      timestamp,
      signature,
      secretKey: getCashfreeSecretKey(),
    })
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const orderId = payload.data?.order?.order_id;
  if (!orderId) return NextResponse.json({ success: true });

  if (
    payload.type === "PAYMENT_SUCCESS_WEBHOOK" ||
    payload.data?.payment?.payment_status === "SUCCESS"
  ) {
    try {
      await cashfreePaymentService.verifyAndSettle(
        orderId,
        payload.data?.payment?.cf_payment_id?.toString(),
      );
    } catch (error) {
      console.error("Cashfree settlement failed", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  } else if (
    payload.type === "PAYMENT_FAILED_WEBHOOK" ||
    payload.type === "PAYMENT_USER_DROPPED_WEBHOOK"
  ) {
    await prisma.cashfreePaymentOrder.updateMany({
      where: { providerOrderId: orderId, feePaymentId: null, status: { not: "PAID" } },
      data: { failureReason: "The latest payment attempt was not completed" },
    });
  }

  return NextResponse.json({ success: true });
}
