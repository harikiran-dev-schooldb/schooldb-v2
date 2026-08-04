"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { teacherColumns } from "../columns";

import { useTeacherTable } from "../hooks/usePeriodTable";

import { TeacherToolbar } from "./PeriodToolbar";

export function TeacherTable() {
  const {
    teachers,

    loading,

    search,
    setSearch,
  } = useTeacherTable();

  return (
    <div className="space-y-4">
      <TeacherToolbar search={search} onSearchChange={setSearch} />

      <DataGrid columns={teacherColumns} data={teachers} loading={loading} />
    </div>
  );
}
