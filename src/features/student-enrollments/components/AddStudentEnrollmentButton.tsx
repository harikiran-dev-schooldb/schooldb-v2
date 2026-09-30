"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { StudentEnrollmentDialog } from "./StudentEnrollmentDialog";

export function AddStudentEnrollmentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add individual enrollment
      </Button>

      <StudentEnrollmentDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
      />
    </>
  );
}
