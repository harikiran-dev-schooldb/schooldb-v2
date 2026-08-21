"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TeacherDialog } from "./TeacherDialog";

export function AddTeacherButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="shadow-md shadow-primary/20"
        onClick={() => setOpen(true)}
      >
        <Plus />
        Add Teacher
      </Button>

      <TeacherDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
