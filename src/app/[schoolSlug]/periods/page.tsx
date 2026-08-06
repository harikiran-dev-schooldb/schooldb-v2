"use client";

import { PageContainer, PageHeader } from "@/components/common/layout";

import { AddPeriodButton } from "@/features/periods/components/AddPeriodButton";
import { PeriodTable } from "@/features/periods/components/PeriodTable";

export default function PeriodPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Periods"
        description="Manage school periods."
        actions={<AddPeriodButton />}
      />

      <PeriodTable />
    </PageContainer>
  );
}
