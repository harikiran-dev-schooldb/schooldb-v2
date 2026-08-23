"use client";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { AddHomeworkButton, HomeworkTable } from "@/features/homework";

export default function HomeworkPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Homework"
        description="Create, manage, and track homework assigned to students."
        actions={<AddHomeworkButton />}
      />

      <HomeworkTable />
    </PageContainer>
  );
}
