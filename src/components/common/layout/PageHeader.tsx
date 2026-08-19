"use client";

import { ReactNode } from "react";

type Props = {
  title: string;

  description?: string;

  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4 md:mb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.035em] md:text-4xl">{title}</h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
