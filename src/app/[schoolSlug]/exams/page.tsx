"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <div className="space-y-6 p-6">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Exams</h1>

          <p className="text-sm text-muted-foreground">
            Create and manage examinations.
          </p>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Exam
        </Button>
      </div>

      {/* Exam List */}

      <ExamList
        key={refreshKey}
        schoolSlug={schoolSlug}
        onCreate={() => setCreateOpen(true)}
      />

      {/* Create Exam Dialog */}

      <CreateExamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
