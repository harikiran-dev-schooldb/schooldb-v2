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
    <div className="mb-8 flex flex-col gap-5 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between md:mb-10">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        )}

        <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground md:text-[2.15rem]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}
