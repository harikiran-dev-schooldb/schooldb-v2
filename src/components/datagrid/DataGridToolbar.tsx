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
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch placeholder={placeholder} onSearch={onSearch} />
      <DataGridFilters
        value={status ?? ""}
        onChange={onStatusChange ?? (() => {})}
      />
    </div>
  );
}
