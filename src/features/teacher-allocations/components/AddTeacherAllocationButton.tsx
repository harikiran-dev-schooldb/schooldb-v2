"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { TeacherAllocationDialog } from "./TeacherAllocationDialog";

export function AddTeacherAllocationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Allocate Teacher
      </Button>

      <TeacherAllocationDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
      />
    </>
  );
}
