import { PageHeader } from "@/components/common/PageHeader";

import { FeeCategoryTable } from "@/features/fees/components/FeeCategoryTable";

import { AddFeeCategoryButton } from "@/features/fees/components/AddFeeCategoryButton";

export default function FeeCategoryPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Fee Categories"
        description="Manage fee categories for the school."
        action={<AddFeeCategoryButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl p-4 md:p-6">
        <FeeCategoryTable />
      </section>
    </div>
  );
}
