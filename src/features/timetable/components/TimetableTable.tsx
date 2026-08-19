"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { timetableColumns } from "../columns";
import { useTimetableTable } from "../hooks/useTimetableTable";

import { TimetableToolbar } from "./TimetableToolbar";

export function TimetableTable() {
  const { data, loading, search, setSearch } = useTimetableTable();

  return (
    <div className="space-y-4">
      <TimetableToolbar search={search} onSearch={setSearch} />

      <DataGrid columns={timetableColumns} data={data} loading={loading} />
    </div>
  );
}
