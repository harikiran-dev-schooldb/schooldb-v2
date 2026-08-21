"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ClassForm } from "./ClassForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  classId?: string;
};

export function ClassDialog({ open, onOpenChange, mode, classId }: Props) {
  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-border/70 bg-card p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-6 sm:px-8">
          <div className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
            Academic structure
          </div>

          <DialogTitle className="mt-3 text-2xl font-bold tracking-tight">
            {isCreate ? "Add a new class" : "Edit class"}
          </DialogTitle>

          <DialogDescription className="max-w-md text-sm leading-6 text-muted-foreground">
            {isCreate
              ? "Create a class and configure its basic academic information."
              : "Update the class information and save your changes."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <ClassForm
            mode={mode}
            classId={classId}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
