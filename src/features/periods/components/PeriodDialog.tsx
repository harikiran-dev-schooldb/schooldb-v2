"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { PeriodForm } from "./PeriodForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  periodId?: string;
};

export function PeriodDialog({ open, onOpenChange, mode, periodId }: Props) {
  function handleSuccess() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Period" : "Edit Period"}
          </DialogTitle>
        </DialogHeader>

        <PeriodForm mode={mode} periodId={periodId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
