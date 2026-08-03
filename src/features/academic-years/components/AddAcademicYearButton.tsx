"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { AcademicYearDialog } from "./AcademicYearDialog";

export function AddAcademicYearButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Academic Year</Button>

      <AcademicYearDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
