"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { SubjectDialog } from "./SubjectDialog";

export function AddSubjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Subject
      </Button>

      <SubjectDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
