"use client";

import type { Column } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataGridColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: Props<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "group flex items-center gap-1.5 text-left transition-colors hover:text-foreground",
        className,
      )}
    >
      <span>{title}</span>

      {sorted === "asc" && <ChevronUp className="size-3.5 text-primary" />}

      {sorted === "desc" && <ChevronDown className="size-3.5 text-primary" />}

      {!sorted && (
        <ChevronsUpDown className="size-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
