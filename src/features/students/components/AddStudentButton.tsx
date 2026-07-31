"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { StudentDialog } from "./StudentDialog";

export function AddStudentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Student</Button>

      <StudentDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
