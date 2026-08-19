"use client";

import { ReactNode } from "react";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";

type Props = {
  search: string;
  onSearch: (value: string) => void;

  placeholder?: string;

  children?: ReactNode;
};

export function CrudToolbar({
  search,
  onSearch,
  placeholder = "Search...",
  children,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-card p-4 md:px-5">
      <DataGridSearch
        placeholder={placeholder}
        value={search}
        onSearch={onSearch}
      />

      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
