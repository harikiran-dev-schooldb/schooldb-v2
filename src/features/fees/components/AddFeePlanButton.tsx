"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FeePlanDialog } from "./FeePlanDialog";

export function AddFeePlanButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Fee Plan</Button>

      <FeePlanDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
