import { PageHeader } from "@/components/common/PageHeader";
import { AddFeePlanButton } from "@/features/fees/components/AddFeePlanButton";
import { FeePlanTable } from "@/features/fees/components/FeePlanTable";

export default function FeePlanPage() {
  return (
    <>
      <PageHeader
        title="Fee Plans"
        description="Manage fee plans and installment schedules for the school."
        action={<AddFeePlanButton />}
      />

      <FeePlanTable />
    </>
  );
}
