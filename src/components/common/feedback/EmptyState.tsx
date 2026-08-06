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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      {icon ?? <Inbox className="mb-4 h-10 w-10 text-muted-foreground" />}

      <h3 className="text-lg font-semibold">{title}</h3>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
