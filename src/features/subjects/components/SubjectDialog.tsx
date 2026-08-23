"use client";

import { BookOpen, Pencil, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SubjectForm } from "./SubjectForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  subjectId?: string;
};

export function SubjectDialog({ open, onOpenChange, mode, subjectId }: Props) {
  const createMode = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/20 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {createMode ? (
                <Plus className="size-5" />
              ) : (
                <Pencil className="size-5" />
              )}
            </div>

            <div>
              <DialogTitle className="text-lg">
                {createMode ? "Create Subject" : "Edit Subject"}
              </DialogTitle>

              <DialogDescription className="mt-1 text-xs leading-relaxed">
                {createMode
                  ? "Add a new subject to your school's academic structure."
                  : "Update the subject details and availability."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <SubjectForm
            mode={mode}
            subjectId={subjectId}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
