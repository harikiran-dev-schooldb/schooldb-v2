"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { periodColumns } from "../columns";

import { usePeriodTable } from "../hooks/usePeriodTable";

import { PeriodToolbar } from "./PeriodToolbar";

export function PeriodTable() {
  const { data, loading, search, setSearch } = usePeriodTable();

  return (
    <div className="space-y-4">
      <PeriodToolbar search={search} onSearch={setSearch} />

      <DataGrid columns={periodColumns} data={data} loading={loading} />
    </div>
  );
}
