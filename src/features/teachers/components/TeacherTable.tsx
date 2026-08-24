"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { teacherColumns } from "../columns";
import { useTeacherTable } from "../hooks/useTeacherTable";
import { TeacherToolbar } from "./TeacherToolbar";

export function TeacherTable() {
  const {
    teachers,
    loading,
    page,
    setPage,
    total,
    pageSize,
    search,
    setSearch,
  } = useTeacherTable();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <DataGrid
      columns={teacherColumns}
      data={teachers}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={<TeacherToolbar search={search} onSearch={setSearch} />}
    />
  );
}
