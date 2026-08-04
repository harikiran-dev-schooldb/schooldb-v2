"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { teacherColumns } from "../columns";

import { useTeacherTable } from "../hooks/useTeacherTable";

import { TeacherToolbar } from "./TeacherToolbar";

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
