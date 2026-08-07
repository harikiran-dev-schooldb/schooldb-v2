"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { teacherColumns } from "../columns";

import { useTeacherTable } from "../hooks/useAttendanceTable";

import { TeacherToolbar } from "./MarkAttendance";

export function TeacherTable() {
  const {
    teachers,

    loading,

    search,
    setSearch,
  } = useTeacherTable();

  return (
    <div className="space-y-4">
      <TeacherToolbar search={search} onSearch={setSearch} />

      <DataGrid columns={teacherColumns} data={teachers} loading={loading} />
    </div>
  );
}
