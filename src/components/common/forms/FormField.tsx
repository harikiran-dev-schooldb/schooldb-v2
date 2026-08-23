"use client";

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: ReactNode;
  children: ReactNode;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
};

export function FormField({
  label,
  children,
  required,
  error,
  description,
  className,
}: Props) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label
          className={cn(
            "text-sm font-semibold tracking-tight text-foreground",
            error && "text-destructive",
          )}
        >
          {label}

          {required && (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>

        {error && (
          <span className="text-xs font-medium text-destructive">
            Required attention
          </span>
        )}
      </div>

      <div
        className={cn(
          "transition-all duration-200",
          error &&
            "[&>input]:border-destructive/60 [&>input]:ring-4 [&>input]:ring-destructive/10",
        )}
      >
        {children}
      </div>

      {description && !error && (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium leading-5 text-destructive">
          <span className="size-1 rounded-full bg-destructive" />
          {error}
        </p>
      )}
    </div>
  );
}
