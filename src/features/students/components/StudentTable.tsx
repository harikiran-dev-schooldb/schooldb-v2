"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { useStudentTable } from "../hooks/useStudentTable";
import { studentColumns } from "../columns";

export function StudentTable() {
  const { students, loading, page, setPage, totalPages, search, setSearch } =
    useStudentTable();

  return (
    <>
      <DataGrid
        columns={studentColumns}
        data={students}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchPlaceholder="Search students..."
        onSearch={setSearch}
      />
    </>
  );
}
