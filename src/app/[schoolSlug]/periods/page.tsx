"use client";

import { PageHeader } from "@/components/common/layout";
import { AddPeriodButton } from "@/features/periods/components/AddPeriodButton";
import { PeriodTable } from "@/features/periods/components/PeriodTable";

export default function PeriodPage() {
  return (
    <div className="space-y-8 pb-6">
      <PageHeader
        title="Periods"
        description="Manage school periods."
        actions={<AddPeriodButton />}
      />

      <div className="p-3 md:p-5">
        <PeriodTable />
      </div>
    </div>
  );
}
