"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TeacherAllocationForm } from "./TeacherAllocationForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  allocationId?: string;
};

export function TeacherAllocationDialog({
  open,
  onOpenChange,
  mode,
  allocationId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Allocate Teacher" : "Edit Allocation"}
          </DialogTitle>
        </DialogHeader>

        <TeacherAllocationForm
          mode={mode}
          allocationId={allocationId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
