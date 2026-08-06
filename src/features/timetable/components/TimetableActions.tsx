"use client";

import { useState } from "react";

import { CrudActionItem, CrudActions } from "@/components/common/crud";

import { TimetableDialog } from "./TimetableDialog";

type Props = {
  timetableId: string;
  onSuccess?: () => void;
};

export function TimetableActions({ timetableId, onSuccess = () => {} }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CrudActions>
        <CrudActionItem type="edit" onClick={() => setOpen(true)} />
      </CrudActions>

      <TimetableDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        timetableId={timetableId}
        onSuccess={onSuccess}
      />
    </>
  );
}
