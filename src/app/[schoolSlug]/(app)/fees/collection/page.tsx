import { ReceiptIndianRupee } from "lucide-react";

import { FeeCollectionContainer } from "@/features/student-fees/components/FeeCollectionContainer";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function FeeCollectionPage({ params }: Props) {
  const { schoolSlug } = await params;
  const membership = await requirePermission(PERMISSIONS.FEE_READ, schoolSlug);
  const allowCashfreeQr = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(
    membership.role,
  );

  return (
    <div className="w-full space-y-6 p-4 pb-10 sm:p-6">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <ReceiptIndianRupee className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Fee Collection
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search a student, review installments, and record fee payments.
          </p>
        </div>
      </div>

      {/* Fee Collection Workspace */}
      <section className="premium-card overflow-hidden rounded-2xl">
        <FeeCollectionContainer
          schoolSlug={schoolSlug}
          allowCashfreeQr={allowCashfreeQr}
        />
      </section>
    </div>
  );
}
