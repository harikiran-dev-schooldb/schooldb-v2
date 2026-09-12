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
    <div className="w-full space-y-7 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Fee Collection
        </h1>

        <p className="text-sm text-slate-500">
          Search a student and collect pending fees.
        </p>
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
