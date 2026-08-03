"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { SectionDialog } from "./SectionDialog";

export function AddSectionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Section</Button>

      <SectionDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
