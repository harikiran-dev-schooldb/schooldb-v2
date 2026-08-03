"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { StudentEnrollmentForm } from "./StudentEnrollmentForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  enrollmentId?: string;
};

export function StudentEnrollmentDialog({
  open,
  onOpenChange,
  mode,
  enrollmentId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Enroll Student" : "Edit Enrollment"}
          </DialogTitle>
        </DialogHeader>

        <StudentEnrollmentForm
          mode={mode}
          enrollmentId={enrollmentId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
