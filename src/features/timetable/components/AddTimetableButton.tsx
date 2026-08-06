"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { TimetableDialog } from "./TimetableDialog";

import { Plus } from "lucide-react";

type Props = {
  onSuccess?: () => void;
};

export function AddTimetableButton({ onSuccess = () => {} }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Timetable
      </Button>

      <TimetableDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={onSuccess}
      />
    </>
  );
}
