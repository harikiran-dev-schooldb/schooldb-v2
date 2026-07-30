"use client";

import { Input } from "@/components/ui/input";
import { Table } from "@tanstack/react-table";

interface Props<TData> {
  table: Table<TData>;
}

export function DataGridToolbar<TData>({ table }: Props<TData>) {
  return (
    <div className="flex items-center justify-between py-4">
      <Input
        placeholder="Search..."
        value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
        onChange={(e) =>
          table.getColumn("fullName")?.setFilterValue(e.target.value)
        }
        className="max-w-sm"
      />
    </div>
  );
}
