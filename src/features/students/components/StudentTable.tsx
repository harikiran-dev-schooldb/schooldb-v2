"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { useStudentTable } from "../hooks/useStudentTable";
import { StudentToolbar } from "./StudentToolbar";

export function StudentTable() {
  const {
    students,
    loading,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    status,
    setStatus,
  } = useStudentTable();

  return (
    <DataGrid
      columns={studentColumns}
      data={students}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={
        <StudentToolbar
          search={search}
          onSearch={setSearch}
          status={status}
          onStatusChange={setStatus}
        />
      }
    />
  );
}
