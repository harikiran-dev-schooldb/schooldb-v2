"use client";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { CreateUpdateView } from "@/components/common/CreateUpdateView";
import { HomeworkForm, HomeworkTable } from "@/features/homework";

export default function HomeworkPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Homework & assignments"
        description="Create and publish classwork with the same clear workflow as school notifications."
      />

      <CreateUpdateView
        label="Homework workspace view"
        create={<HomeworkForm mode="create" />}
        update={<HomeworkTable />}
      />
    </PageContainer>
  );
}
