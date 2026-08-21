import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-card/70 px-6 py-16 text-center shadow-sm backdrop-blur-sm sm:px-10 sm:py-20">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-primary/[0.04] blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        {icon && (
          <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.08] text-primary shadow-sm">
            {icon}
          </div>
        )}

        <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {action && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
