"use client";

import { useState } from "react";

import { CreateButton } from "@/components/common/crud";

import { PeriodDialog } from "./PeriodDialog";

export function AddPeriodButton() {
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
  }

  return (
    <>
      <CreateButton label="Add Period" onClick={() => setOpen(true)} />

      <PeriodDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
