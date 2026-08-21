"use client";

import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>

      <AlertDialogContent className="max-w-[430px] p-0 overflow-hidden">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-6 pt-6 pb-5">
          <div
            className={[
              "flex size-11 items-center justify-center rounded-2xl shadow-sm",
              destructive
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
            ].join(" ")}
          >
            <AlertTriangle className="size-5" />
          </div>

          <AlertDialogHeader className="mt-5 gap-2">
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>

            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="bg-muted/[0.35] px-6 py-4">
          <AlertDialogCancel className="min-w-24">
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "min-w-24 bg-destructive text-white hover:bg-destructive/90"
                : "min-w-24"
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
