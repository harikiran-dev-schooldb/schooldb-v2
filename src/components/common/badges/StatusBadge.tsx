"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: Props) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className="flex items-center gap-1.5"
    >
      {active && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex size-1.5 rounded-full bg-teal-500"></span>
        </span>
      )}
      {!active && <span className="size-1.5 rounded-full bg-slate-300" />}
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
