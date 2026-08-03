"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SectionForm } from "./SectionForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  sectionId?: string;
};

export function SectionDialog({ open, onOpenChange, mode, sectionId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Section" : "Edit Section"}
          </DialogTitle>
        </DialogHeader>

        <SectionForm
          mode={mode}
          sectionId={sectionId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
