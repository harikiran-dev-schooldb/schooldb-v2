"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { CrudToolbar } from "@/components/common/crud";

import { homeworkColumns } from "../columns";
import { useHomeworkTable } from "../hooks/useHomeworkTable";

type Props = {
  className?: string;
};

export function HomeworkTable({ className }: Props) {
  const { data, loading, reload, search, setSearch } = useHomeworkTable();

  return (
    <div className={className}>
      <CrudToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search homework..."
      />

      <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
        <DataGrid
          columns={homeworkColumns(reload)}
          data={data}
          loading={loading}
        />
      </div>
    </div>
  );
}
