"use client";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";

type Props = {
  search: string;
  onSearch: (value: string) => void;
};

export function StudentEnrollmentToolbar({ search, onSearch }: Props) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch
        value={search}
        placeholder="Search enrollments..."
        onSearch={onSearch}
      />
    </div>
  );
}
