"use client";

import { CrudDialog } from "@/components/common/crud";
import { TimetableForm } from "./TimetableForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  timetableId?: string;

  onSuccess: () => void;
};

export function TimetableDialog({
  open,
  onOpenChange,
  mode,
  timetableId,
  onSuccess,
}: Props) {
  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add Timetable" : "Edit Timetable"}
      description={
        mode === "create"
          ? "Create a timetable entry."
          : "Update timetable entry."
      }
    >
      <TimetableForm
        mode={mode}
        timetableId={timetableId}
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
      />
    </CrudDialog>
  );
}
