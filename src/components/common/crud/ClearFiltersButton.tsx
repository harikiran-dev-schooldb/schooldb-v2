"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  label?: string;
  className?: string;
};

export function ClearFiltersButton({
  onClick,
  label = "Clear",
  className,
}: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "group h-10 shrink-0 rounded-xl border-primary/20",
        "bg-gradient-to-b from-card to-primary/[0.045] px-3.5",
        "font-semibold text-foreground shadow-[0_4px_14px_rgb(15_23_42_/_0.06)]",
        "transition-all duration-200 hover:-translate-y-px hover:border-primary/35",
        "hover:bg-primary/[0.07] hover:text-primary hover:shadow-[0_8px_20px_rgb(79_70_229_/_0.12)]",
        "active:translate-y-0 active:shadow-sm",
        className,
      )}
    >
      <RotateCcw className="size-3.5 transition-transform duration-300 group-hover:-rotate-45" />
      {label}
    </Button>
  );
}
