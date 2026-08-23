"use client";

import { CrudDialog } from "@/components/common/crud";
import { TeacherAllocationForm } from "./TeacherAllocationForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  allocationId?: string;
  onSuccess?: () => void;
};

export function TeacherAllocationDialog({
  open,
  onOpenChange,
  mode,
  allocationId,
  onSuccess,
}: Props) {
  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Allocate Teacher" : "Edit Teacher Allocation"}
      description={
        mode === "create"
          ? "Assign a teacher to a subject, class and section for an academic year."
          : "Update the teacher allocation details."
      }
    >
      <TeacherAllocationForm
        mode={mode}
        allocationId={allocationId}
        onSuccess={() => {
          onSuccess?.();
          onOpenChange(false);
        }}
      />
    </CrudDialog>
  );
}
