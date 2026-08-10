"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeePlanForm } from "./FeePlanForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  feePlanId?: string;
};

export function FeePlanDialog({ open, onOpenChange, mode, feePlanId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Fee Plan" : "Edit Fee Plan"}
          </DialogTitle>
        </DialogHeader>

        <FeePlanForm
          mode={mode}
          feePlanId={feePlanId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
