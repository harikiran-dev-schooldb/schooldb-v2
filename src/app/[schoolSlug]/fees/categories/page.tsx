import { PageHeader } from "@/components/common/PageHeader";

import { FeeCategoryTable } from "@/features/fees/components/FeeCategoryTable";

import { AddFeeCategoryButton } from "@/features/fees/components/AddFeeCategoryButton";

export default function FeeCategoryPage() {
  return (
    <>
      <PageHeader
        title="Fee Categories"
        description="Manage fee categories for the school."
        action={<AddFeeCategoryButton />}
      />

      <FeeCategoryTable />
    </>
  );
}
