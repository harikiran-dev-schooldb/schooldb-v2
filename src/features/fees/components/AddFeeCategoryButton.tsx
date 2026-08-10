"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FeeCategoryDialog } from "./FeeCategoryDialog";

export function AddFeeCategoryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Fee Category</Button>

      <FeeCategoryDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
