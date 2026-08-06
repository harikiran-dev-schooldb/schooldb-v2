"use client";

import { useState } from "react";

import { Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { CrudActions } from "@/components/common/crud";

import { PeriodDialog } from "./PeriodDialog";

type Props = {
  periodId: string;
};

export function PeriodActions({ periodId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CrudActions>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
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
