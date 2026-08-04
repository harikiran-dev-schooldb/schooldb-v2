"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { TeacherDialog } from "./PeriodDialog";

export function AddTeacherButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Teacher
      </Button>

      <TeacherDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
