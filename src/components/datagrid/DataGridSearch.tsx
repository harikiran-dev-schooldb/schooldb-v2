"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        className="h-10 rounded-xl border-border/70 bg-background pl-10 pr-10 shadow-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/15"
      />

      {value && onSearch ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => onSearch("")}
          className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
