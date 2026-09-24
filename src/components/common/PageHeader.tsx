import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  action,
  eyebrow = "School Management",
}: Props) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
      {/* Title area */}
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        )}

        <h1 className="break-words text-2xl font-bold tracking-[-0.04em] text-foreground sm:text-3xl md:text-[2rem]">
          {title}
        </h1>

        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {action}
        </div>
      )}
    </header>
  );
}
