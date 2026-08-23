"use client";

import { useState } from "react";

import { CrudActionItem, CrudActions } from "@/components/common/crud";

import { TimetableDialog } from "./TimetableDialog";

type Props = {
  timetableId: string;
  onSuccess?: () => void;
};

export function TimetableActions({ timetableId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  function handleEdit() {
    setOpen(true);
  }

  function handleSuccess() {
    setOpen(false);
    onSuccess?.();
  }

  return (
    <>
      <CrudActions>
        <CrudActionItem type="edit" onClick={handleEdit} />
      </CrudActions>

      <TimetableDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        timetableId={timetableId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
