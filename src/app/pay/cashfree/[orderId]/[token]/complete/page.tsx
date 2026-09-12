import { notFound } from "next/navigation";

import { PublicPaymentStatus } from "@/features/online-payments/components/PublicPaymentStatus";
import { hashCashfreePublicToken } from "@/features/online-payments/services/cashfree-payment.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicCashfreeCompletePage({
  params,
}: {
  params: Promise<{ orderId: string; token: string }>;
}) {
  const { orderId, token } = await params;
  const order = await prisma.cashfreePaymentOrder.findFirst({
    where: {
      providerOrderId: orderId,
      publicTokenHash: hashCashfreePublicToken(token),
      initiatedBy: "STAFF_QR",
    },
    select: { amount: true, status: true },
  });
  if (!order) notFound();

  return (
    <PublicPaymentStatus
      orderId={orderId}
      token={token}
      amount={Number(order.amount)}
      initialStatus={order.status}
    />
  );
}
