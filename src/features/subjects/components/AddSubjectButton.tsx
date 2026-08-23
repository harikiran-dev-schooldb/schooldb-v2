"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { SubjectDialog } from "./SubjectDialog";

export function AddSubjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-xl px-4 shadow-sm"
      >
        <Plus className="mr-2 size-4" />
        Add Subject
      </Button>

      <SubjectDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
