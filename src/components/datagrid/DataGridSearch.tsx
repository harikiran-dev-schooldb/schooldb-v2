"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type Props = {
  value?: string;
  placeholder?: string;
  onSearch?: (value: string) => void;
};

export function DataGridSearch({
  placeholder = "Search records...",
  onSearch,
  value,
}: Props) {
  return (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onSearch?.(event.target.value)}
        className="h-10 rounded-xl border-border/70 bg-background pl-10 pr-4 shadow-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/15"
      />
    </div>
  );
}
