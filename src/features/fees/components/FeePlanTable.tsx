"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { DataGridSearch } from "@/components/datagrid/DataGridSearch";

import { feePlanColumns } from "../fee-plan-columns";

import { useFeePlanTable } from "./hooks/useFeePlanTable";

export function FeePlanTable() {
  const { feePlans, loading, search, setSearch } = useFeePlanTable();

  return (
    <DataGrid
      columns={feePlanColumns}
      data={feePlans}
      loading={loading}
      toolbar={
        <DataGridSearch
          value={search}
          onSearch={setSearch}
          placeholder="Search fee plans..."
        />
      }
    />
  );
}
