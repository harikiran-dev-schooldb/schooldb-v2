"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TeacherAllocationDialog } from "./TeacherAllocationDialog";
import type { TeacherAllocationInitialSelection } from "./TeacherAllocationForm";

type Props = {
  onSuccess?: () => void;
  initialSelection?: TeacherAllocationInitialSelection;
};

export function AddTeacherAllocationButton({ onSuccess, initialSelection }: Props) {
  const [open, setOpen] = useState(Boolean(initialSelection));

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="size-4" />
        Allocate Teacher
      </Button>

      <TeacherAllocationDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={onSuccess}
        initialSelection={initialSelection}
      />
    </>
  );
}
