"use client";

import { useState, type ReactNode } from "react";
import { RefreshCcw, UserPlus } from "lucide-react";

import { SegmentedSwitch } from "@/components/ui/segmented-switch";
import { cn } from "@/lib/utils";

export function CreateUpdateView({
  create,
  update,
  createLabel = "Create",
  updateLabel = "Update",
  label = "Page view",
  className,
  switchClassName,
}: {
  create: ReactNode;
  update: ReactNode;
  createLabel?: string;
  updateLabel?: string;
  label?: string;
  className?: string;
  switchClassName?: string;
}) {
  const [view, setView] = useState<"create" | "update">("create");

  return (
    <div className={cn("space-y-6", className)}>
      <SegmentedSwitch
        value={view}
        onChange={setView}
        label={label}
        className={cn("sm:w-[360px]", switchClassName)}
        options={[
          { value: "create", label: createLabel, icon: UserPlus },
          { value: "update", label: updateLabel, icon: RefreshCcw },
        ]}
      />
      <div role="tabpanel">{view === "create" ? create : update}</div>
    </div>
  );
}
