"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ClassDialog } from "./ClassDialog";

export function AddClassButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Class</Button>

      <ClassDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
