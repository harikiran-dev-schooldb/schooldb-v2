"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { homeworkColumns } from "../columns";
import { useHomeworkTable } from "../hooks/useHomeworkTable";

export function HomeworkTable() {
  const { data, loading, search, setSearch, reload } = useHomeworkTable();

  return (
    <div className="space-y-4">
      <DataGrid
        columns={homeworkColumns(reload)}
        data={data}
        loading={loading}
      />
    </div>
  );
}
