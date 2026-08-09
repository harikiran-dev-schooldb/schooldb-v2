"use client";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { AddHomeworkButton, HomeworkTable } from "@/features/homework";

export default function PeriodPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Periods"
        description="Manage school periods."
        actions={<AddHomeworkButton />}
      />

      <HomeworkTable />
    </PageContainer>
  );
}
