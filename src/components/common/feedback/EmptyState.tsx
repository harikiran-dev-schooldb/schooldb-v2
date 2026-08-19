"use client";

import { ReactNode } from "react";

import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export function EmptyState({
  title = "No data found",
  description = "There is nothing to display.",
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/25 bg-card/55 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-primary/10 p-3 text-primary">{icon ?? <Inbox className="h-7 w-7" />}</div>

      <h3 className="text-lg font-semibold">{title}</h3>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
