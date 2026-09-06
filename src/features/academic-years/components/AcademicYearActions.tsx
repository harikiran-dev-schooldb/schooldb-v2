"use client";

import { useState } from "react";

import { Check, Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { AcademicYearDialog } from "./AcademicYearDialog";

import { toast } from "sonner";
import { refreshTable } from "@/lib/table-event";

type Props = {
  academicYearId: string;
  active: boolean;
};

export function AcademicYearActions({ academicYearId, active }: Props) {
  const [open, setOpen] = useState(false);

  async function activate() {
    const res = await fetch(
      `/api/v1/academic-years/${academicYearId}/activate`,
      {
        method: "PATCH",
      },
    );

    const result = await res.json();

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success("Academic year activated.");

    refreshTable("academic-years");
  }

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>

        {!active && (
          <DropdownMenuItem onClick={activate}>
            <Check className="mr-2 h-4 w-4" />
            Set Active
          </DropdownMenuItem>
        )}
      </ActionMenu>

      <AcademicYearDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        academicYearId={academicYearId}
      />
    </>
  );
}
