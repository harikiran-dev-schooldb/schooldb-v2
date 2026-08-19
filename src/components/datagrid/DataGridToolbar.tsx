"use client";

import { StudentStatus } from "@/generated/prisma/browser";
import { DataGridSearch } from "./DataGridSearch";
import { DataGridFilters } from "./DataGridFilters";

type Props = {
  placeholder?: string;
  onSearch?: (value: string) => void;
  status?: StudentStatus | "";

  onStatusChange?: (value: StudentStatus | "") => void;
};

export function DataGridToolbar({
  placeholder,
  onSearch,
  status,
  onStatusChange,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-card p-4 md:px-5">
      <DataGridSearch placeholder={placeholder} onSearch={onSearch} />
      <DataGridFilters
        value={status ?? ""}
        onChange={onStatusChange ?? (() => {})}
      />
    </div>
  );
}
