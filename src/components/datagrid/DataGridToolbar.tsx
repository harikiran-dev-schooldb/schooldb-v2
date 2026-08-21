"use client";

import type { StudentStatus } from "@/generated/prisma/client";

import { DataGridFilters } from "./DataGridFilters";
import { DataGridSearch } from "./DataGridSearch";

type Props = {
  placeholder?: string;
  value?: string;
  onSearch?: (value: string) => void;

  status?: StudentStatus | "";
  onStatusChange?: (value: StudentStatus | "") => void;
};

export function DataGridToolbar({
  placeholder,
  value,
  onSearch,
  status,
  onStatusChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <DataGridSearch
        value={value}
        placeholder={placeholder}
        onSearch={onSearch}
      />

      {onStatusChange && (
        <DataGridFilters value={status ?? ""} onChange={onStatusChange} />
      )}
    </div>
  );
}
