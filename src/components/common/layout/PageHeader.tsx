"use client";

import { ReactNode } from "react";

type Props = {
  title: string;

  description?: string;

  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
