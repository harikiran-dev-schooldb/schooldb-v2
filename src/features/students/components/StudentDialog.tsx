"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { StudentForm } from "./StudentForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  studentId?: string;
};

export function StudentDialog({ open, onOpenChange, mode, studentId }: Props) {
  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl border-border/70 bg-card p-0 shadow-2xl sm:rounded-3xl">
        <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-6 sm:px-8">
          <div className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
            Student management
          </div>

          <DialogTitle className="mt-3 text-2xl font-bold tracking-tight">
            {isCreate ? "Add a new student" : "Edit student"}
          </DialogTitle>

          <DialogDescription className="max-w-xl text-sm leading-6 text-muted-foreground">
            {isCreate
              ? "Enter the student's basic information to create a new student record."
              : "Update the student's information and save your changes."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <StudentForm
            mode={mode}
            studentId={studentId}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
