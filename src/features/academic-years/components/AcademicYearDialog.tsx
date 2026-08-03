"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AcademicYearForm } from "./AcademicYearForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  academicYearId?: string;
};

export function AcademicYearDialog({
  open,
  onOpenChange,
  mode,
  academicYearId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Academic Year" : "Edit Academic Year"}
          </DialogTitle>
        </DialogHeader>

        <AcademicYearForm
          mode={mode}
          academicYearId={academicYearId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
