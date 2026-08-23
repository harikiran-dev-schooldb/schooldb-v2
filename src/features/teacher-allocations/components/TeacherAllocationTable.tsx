"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { useTeacherAllocationTable } from "../hooks/useTeacherAllocationTable";
import { teacherAllocationColumns } from "../columns";
import { TeacherAllocationToolbar } from "./TeacherAllocationToolbar";

type Props = {
  className?: string;
};

export function TeacherAllocationTable({ className }: Props) {
  const { allocations, loading, search, setSearch, reload } =
    useTeacherAllocationTable();

  return (
    <div className={className}>
      <TeacherAllocationToolbar
        search={search}
        onSearchChange={setSearch}
        onSuccess={reload}
      />

      <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
        <DataGrid
          columns={teacherAllocationColumns}
          data={allocations}
          loading={loading}
        />
      </div>
    </div>
  );
}
