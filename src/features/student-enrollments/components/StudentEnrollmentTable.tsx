"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { studentEnrollmentColumns } from "../columns";

import { useStudentEnrollmentTable } from "../hooks/useStudentEnrollmentTable";

import { StudentEnrollmentToolbar } from "./StudentEnrollmentToolbar";

export function StudentEnrollmentTable() {
  const {
    enrollments,
    loading,

    page,
    setPage,

    totalPages,

    search,
    setSearch,
  } = useStudentEnrollmentTable();

  return (
    <DataGrid
      columns={studentEnrollmentColumns}
      data={enrollments}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={
        <StudentEnrollmentToolbar search={search} onSearch={setSearch} />
      }
    />
  );
}
