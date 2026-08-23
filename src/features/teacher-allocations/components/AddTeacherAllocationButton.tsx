"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TeacherAllocationDialog } from "./TeacherAllocationDialog";

type Props = {
  onSuccess?: () => void;
};

export function AddTeacherAllocationButton({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);

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
      />
    </>
  );
}
