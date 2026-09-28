import { PageContainer, PageHeader } from "@/components/common/layout";
import { DirectUpiVerificationTable } from "@/features/online-payments/components/DirectUpiVerificationTable";
import { directUpiPaymentService } from "@/features/online-payments/services/direct-upi-payment.service";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DirectUpiVerificationPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    schoolSlug,
  );
  const rows = await directUpiPaymentService.listForReview(membership.schoolId);

  return (
    <PageContainer>
      <PageHeader
        title="UPI Verification"
        description="Match parent-submitted UTRs with the school bank statement before creating fee receipts."
      />
      <DirectUpiVerificationTable schoolSlug={schoolSlug} rows={rows} />
    </PageContainer>
  );
}
