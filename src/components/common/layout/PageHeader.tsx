"use client";

import { ReactNode } from "react";

type Props = {
  title: string;

  description?: string;

  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="mb-6 flex min-w-0 flex-col items-start gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between md:mb-10">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold tracking-[-0.035em] sm:text-3xl md:text-4xl">{title}</h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
