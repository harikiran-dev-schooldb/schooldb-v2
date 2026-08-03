"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { academicYearColumns } from "../columns";

import { useAcademicYearTable } from "../hooks/useAcademicYearTable";

import { AcademicYearToolbar } from "./AcademicYearToolbar";

export function AcademicYearTable() {
  const {
    academicYears,
    loading,

    page,
    setPage,

    totalPages,

    search,
    setSearch,
  } = useAcademicYearTable();

  return (
    <DataGrid
      columns={academicYearColumns}
      data={academicYears}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={<AcademicYearToolbar search={search} onSearch={setSearch} />}
    />
  );
}
