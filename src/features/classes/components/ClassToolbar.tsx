"use client";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function ClassToolbar({ search, onSearch }: Props) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch
        value={search}
        placeholder="Search classes..."
        onSearch={onSearch}
      />
    </div>
  );
}
