"use client";

import { DataGridSearch } from "./DataGridSearch";

type Props = {
  placeholder?: string;
  onSearch?: (value: string) => void;
};

export function DataGridToolbar({ placeholder, onSearch }: Props) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <DataGridSearch placeholder={placeholder} onSearch={onSearch} />

      <div />
    </div>
  );
}
