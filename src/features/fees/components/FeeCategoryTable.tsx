"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { feeCategoryColumns } from "../columns";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";
import { useFeeCategoryTable } from "./hooks/useFeeCategoryTable";

export function FeeCategoryTable() {
  const { feeCategories, loading, search, setSearch } = useFeeCategoryTable();

  return (
    <DataGrid
      columns={feeCategoryColumns}
      data={feeCategories}
      loading={loading}
      toolbar={
        <div className="flex items-center justify-between border-b p-4">
          <DataGridSearch
            value={search}
            placeholder="Search fee categories..."
            onSearch={setSearch}
          />
        </div>
      }
    />
  );
}
