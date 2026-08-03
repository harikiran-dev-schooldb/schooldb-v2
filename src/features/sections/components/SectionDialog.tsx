"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassForm } from "./SectionForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  classId?: string;
};

export function ClassDialog({ open, onOpenChange, mode, classId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Class" : "Edit Class"}
          </DialogTitle>
        </DialogHeader>

        <ClassForm
          mode={mode}
          classId={classId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
