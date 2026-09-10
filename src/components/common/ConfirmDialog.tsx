"use client";

import type { ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";

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
import { cn } from "@/lib/utils";

type ConfirmDialogDetail = {
  label: string;
  value: ReactNode;
};

type ConfirmDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  tone?: "primary" | "warning" | "destructive";
  eyebrow?: string;
  icon?: LucideIcon;
  details?: ConfirmDialogDetail[];
  consequence?: string;
  pending?: boolean;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  destructive = false,
  tone,
  eyebrow = "Please confirm",
  icon: Icon = AlertTriangle,
  details = [],
  consequence,
  pending = false,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const resolvedTone = tone ?? (destructive ? "destructive" : "primary");
  const toneStyles = {
    primary: {
      icon: "bg-primary/10 text-primary ring-primary/15",
      glow: "from-primary/[0.12] via-primary/[0.025] to-transparent",
      eyebrow: "text-primary",
      consequence: "border-primary/15 bg-primary/[0.045] text-foreground",
      action: "",
    },
    warning: {
      icon: "bg-amber-100 text-amber-700 ring-amber-200/70",
      glow: "from-amber-500/[0.14] via-amber-500/[0.025] to-transparent",
      eyebrow: "text-amber-700",
      consequence: "border-amber-200/80 bg-amber-50 text-amber-950",
      action: "bg-amber-600 text-white hover:bg-amber-700",
    },
    destructive: {
      icon: "bg-rose-100 text-rose-700 ring-rose-200/70",
      glow: "from-rose-500/[0.14] via-rose-500/[0.025] to-transparent",
      eyebrow: "text-rose-700",
      consequence: "border-rose-200/80 bg-rose-50 text-rose-950",
      action: "bg-rose-600 text-white hover:bg-rose-700",
    },
  }[resolvedTone];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}

      <AlertDialogContent className="max-w-[470px] gap-0 overflow-hidden border-white/80 p-0">
        <div className={cn("relative border-b border-border/60 bg-gradient-to-br px-6 pb-5 pt-6", toneStyles.glow)}>
          <div className="absolute right-0 top-0 size-36 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/50 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1", toneStyles.icon)}>
              <Icon className="size-5" />
            </div>

            <AlertDialogHeader className="gap-1.5 pt-0.5 text-left">
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", toneStyles.eyebrow)}>{eyebrow}</p>
              <AlertDialogTitle className="text-xl leading-tight">{title}</AlertDialogTitle>
              <AlertDialogDescription className="max-w-sm leading-5">{description}</AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        {(details.length > 0 || consequence) && (
          <div className="space-y-3 bg-background px-6 py-5">
            {details.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {details.map((detail) => (
                  <div key={detail.label} className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{detail.label}</p>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">{detail.value}</div>
                  </div>
                ))}
              </div>
            )}

            {consequence && (
              <div className={cn("flex gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-5", toneStyles.consequence)}>
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{consequence}</p>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter className="border-t border-border/60 bg-muted/[0.3] px-6 py-4">
          <AlertDialogCancel className="min-w-24" disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className={cn("min-w-28", toneStyles.action)}
          >
            {pending ? "Please wait…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
