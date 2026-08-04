"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { teacherAllocationColumns } from "../columns";

import { useTeacherAllocationTable } from "../hooks/useTeacherAllocationTable";

import { TeacherAllocationToolbar } from "./TeacherAllocationToolbar";

export function TeacherAllocationTable() {
  const {
    allocations,
    loading,

    search,
    setSearch,
  } = useTeacherAllocationTable();

  return (
    <div className="space-y-4">
      <TeacherAllocationToolbar search={search} onSearchChange={setSearch} />

      <DataGrid
        columns={teacherAllocationColumns}
        data={allocations}
        loading={loading}
      />
    </div>
  );
}
