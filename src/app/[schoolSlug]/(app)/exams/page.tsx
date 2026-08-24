"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { ExamList } from "@/features/exams/components/ExamList";
import { CreateExamDialog } from "@/features/exams/components/CreateExamDialog";

export default function ExamsPage() {
  const params = useParams<{ schoolSlug: string }>();

  const schoolSlug = params.schoolSlug;

  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSuccess() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exams"
        description="Plan examinations, schedules, marks and results."
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgb(15_118_110_/_0.18)] transition-all hover:bg-primary/90 hover:shadow-[0_10px_25px_rgb(15_118_110_/_0.24)] active:scale-[0.98]"
          >
            <span className="text-base">+</span>
            Create Exam
          </button>
        }
      />

      <ExamList
        key={refreshKey}
        schoolSlug={schoolSlug}
        onCreate={() => setCreateOpen(true)}
      />

      <CreateExamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
