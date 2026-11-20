"use client";

import { CrudDialog } from "@/components/common/crud";
import { TimetableForm, type TimetableInitialSelection } from "./TimetableForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  timetableId?: string;
  onSuccess: () => void;
  initialSelection?: TimetableInitialSelection;
};

export function TimetableDialog({
  open,
  onOpenChange,
  mode,
  timetableId,
  onSuccess,
  initialSelection,
}: Props) {
  function handleSuccess() {
    // Close first
    onOpenChange(false);

    // Then refresh parent data
    onSuccess();
  }

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
        onSuccess={handleSuccess}
        initialSelection={initialSelection}
      />
    </CrudDialog>
  );
}
