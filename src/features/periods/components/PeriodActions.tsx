"use client";

import { useState } from "react";

import { CrudActionItem, CrudActions } from "@/components/common/crud";

import { PeriodDialog } from "./PeriodDialog";

type Props = {
  periodId: string;
};

export function PeriodActions({ periodId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CrudActions>
        <CrudActionItem type="edit" onClick={() => setOpen(true)} />
      </CrudActions>

      <PeriodDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        periodId={periodId}
      />
    </>
  );
}
