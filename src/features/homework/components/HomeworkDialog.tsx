"use client";

import { CrudDialog } from "@/components/common/crud";

import { HomeworkForm } from "./HomeworkForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  homeworkId?: string;
  onSuccess: () => void;
};

export function HomeworkDialog({
  open,
  onOpenChange,
  mode,
  homeworkId,
  onSuccess,
}: Props) {
  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add Homework" : "Edit Homework"}
      description={
        mode === "create"
          ? "Create a homework assignment for a class or section."
          : "Update the homework assignment details."
      }
    >
      <HomeworkForm
        mode={mode}
        homeworkId={homeworkId}
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
      />
    </CrudDialog>
  );
}
