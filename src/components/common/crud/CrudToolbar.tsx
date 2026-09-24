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
    <div className="flex flex-col gap-3 border-b border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 md:px-5">
      <DataGridSearch
        placeholder={placeholder}
        value={search}
        onSearch={onSearch}
      />

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
        {children}
      </div>
    </div>
  );
}
