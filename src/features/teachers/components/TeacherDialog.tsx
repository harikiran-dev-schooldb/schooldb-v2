"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TeacherForm } from "./TeacherForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  teacherId?: string;
};

export function TeacherDialog({ open, onOpenChange, mode, teacherId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Teacher" : "Edit Teacher"}
          </DialogTitle>
        </DialogHeader>

        <TeacherForm
          mode={mode}
          teacherId={teacherId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
