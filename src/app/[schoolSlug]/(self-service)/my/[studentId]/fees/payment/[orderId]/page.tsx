import { notFound } from "next/navigation";

import { SelfServicePage } from "@/components/self-service/SelfServicePage";
import { PaymentStatusCard } from "@/features/online-payments/components/PaymentStatusCard";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/student-access";

export const dynamic = "force-dynamic";

export default async function PaymentResultPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string; orderId: string }>;
}) {
  const { schoolSlug, studentId, orderId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  if (!enrollment) notFound();

  const order = await prisma.cashfreePaymentOrder.findFirst({
    where: {
      providerOrderId: orderId,
      schoolId: membership.schoolId,
      studentEnrollmentId: enrollment.id,
    },
  });
  if (!order) notFound();

  return (
    <SelfServicePage title="Payment status" description="Secure online fee payment confirmation.">
      <PaymentStatusCard
        schoolSlug={schoolSlug}
        studentId={studentId}
        orderId={order.providerOrderId}
        amount={Number(order.amount)}
        initialStatus={order.status}
      />
    </SelfServicePage>
  );
}
