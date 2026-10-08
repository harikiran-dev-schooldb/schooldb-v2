"use client";

import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

export function SegmentedSwitch<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-100/80 p-1",
        className,
      )}
      role="tablist"
      aria-label={label}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all",
              selected
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/70"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
