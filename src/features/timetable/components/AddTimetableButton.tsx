"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { TimetableDialog } from "./TimetableDialog";
import type { TimetableInitialSelection } from "./TimetableForm";

type Props = {
  onSuccess?: () => void;
  initialSelection?: TimetableInitialSelection;
};

export function AddTimetableButton({ onSuccess, initialSelection }: Props) {
  const [open, setOpen] = useState(Boolean(initialSelection));

  function handleSuccess() {
    setOpen(false);
    onSuccess?.();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Timetable
      </Button>

      <TimetableDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={handleSuccess}
        initialSelection={initialSelection}
      />
    </>
  );
}
