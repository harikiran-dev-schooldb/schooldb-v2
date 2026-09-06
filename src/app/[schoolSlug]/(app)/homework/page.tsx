"use client";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { HomeworkForm, HomeworkTable } from "@/features/homework";

export default function HomeworkPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Homework & assignments"
        description="Create and publish classwork with the same clear workflow as school notifications."
      />

      <HomeworkForm mode="create" />
      <HomeworkTable className="mt-8" />
    </PageContainer>
  );
}
