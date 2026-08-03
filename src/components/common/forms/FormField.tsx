"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  label: string;

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
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">
        {label}

        {required && <span className="ml-1 text-destructive">*</span>}
      </label>

      {children}

      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
