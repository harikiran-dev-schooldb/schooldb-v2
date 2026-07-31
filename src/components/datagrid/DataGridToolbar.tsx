"use client";

import { DataGridSearch } from "./DataGridSearch";

type Props = {
  onSearch?: (value: string) => void;
};

export function DataGridToolbar({ onSearch }: Props) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch placeholder="Search..." onSearch={onSearch} />

      <div className="flex gap-2"></div>
    </div>
  );
}
