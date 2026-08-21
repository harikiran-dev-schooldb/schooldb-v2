"use client";

import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudentDialog } from "./StudentDialog";

export function AddStudentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        className="group h-11 rounded-xl bg-gradient-to-r from-primary to-primary/85 px-5 font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
      >
        <span className="relative mr-2 flex size-6 items-center justify-center rounded-lg bg-white/15">
          <Plus className="size-4 transition-transform duration-200 group-hover:rotate-90" />
        </span>

        <span>Add Student</span>

        <UserPlus className="ml-2 size-4 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Button>

      <StudentDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
