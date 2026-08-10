"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeeCategoryForm } from "./FeeCategoryForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";

  feeCategoryId?: string;
};

export function FeeCategoryDialog({
  open,
  onOpenChange,
  mode,
  feeCategoryId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Fee Category" : "Edit Fee Category"}
          </DialogTitle>
        </DialogHeader>

        <FeeCategoryForm
          mode={mode}
          feeCategoryId={feeCategoryId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
