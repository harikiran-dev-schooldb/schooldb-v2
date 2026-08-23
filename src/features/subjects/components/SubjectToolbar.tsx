"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function SubjectToolbar({ search, onSearch }: Props) {
  return (
    <div className="border-b bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Search className="size-4" />
            </div>

            <h2 className="text-sm font-semibold">Subject Directory</h2>
          </div>

          <p className="mt-1 pl-10 text-xs text-muted-foreground">
            Search and manage subjects configured for this school.
          </p>
        </div>

        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search subjects..."
            className="h-10 w-full rounded-xl border bg-background pl-9 pr-10 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />

          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSearch("")}
              className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
