"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { CrudActions, CrudActionItem } from "@/components/common/crud";
import { TeacherAllocationDialog } from "./TeacherAllocationDialog";

type Props = {
  allocationId: string;
  onSuccess?: () => void;
};

export function TeacherAllocationActions({ allocationId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CrudActions>
        <CrudActionItem type="edit" onClick={() => setOpen(true)} />
      </CrudActions>

      <TeacherAllocationDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        allocationId={allocationId}
        onSuccess={onSuccess}
      />
    </>
  );
}
