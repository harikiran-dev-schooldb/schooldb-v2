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
    <Badge variant={active ? "default" : "secondary"}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
