import { notFound } from "next/navigation";

import { getCashfreeMode } from "@/features/online-payments/cashfree";
import { PublicCashfreeCheckout } from "@/features/online-payments/components/PublicCashfreeCheckout";
import { PublicPaymentStatus } from "@/features/online-payments/components/PublicPaymentStatus";
import { hashCashfreePublicToken } from "@/features/online-payments/services/cashfree-payment.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicCashfreePage({
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
    select: {
      amount: true,
      status: true,
      paymentSessionId: true,
      school: { select: { name: true } },
    },
  });
  if (!order || !order.paymentSessionId) notFound();

  if (order.status !== "ACTIVE") {
    return (
      <PublicPaymentStatus
        orderId={orderId}
        token={token}
        amount={Number(order.amount)}
        initialStatus={order.status}
      />
    );
  }

  return (
    <PublicCashfreeCheckout
      schoolName={order.school.name}
      amount={Number(order.amount)}
      paymentSessionId={order.paymentSessionId}
      mode={getCashfreeMode()}
      orderId={orderId}
    />
  );
}
