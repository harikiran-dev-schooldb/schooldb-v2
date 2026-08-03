"use client";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function SectionToolbar({ search, onSearch }: Props) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch
        value={search}
        placeholder="Search sections..."
        onSearch={onSearch}
      />
    </div>
  );
}
