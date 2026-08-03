"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { StudentEnrollmentDialog } from "./StudentEnrollmentDialog";

export function AddStudentEnrollmentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Enroll Student</Button>

      <StudentEnrollmentDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
      />
    </>
  );
}
