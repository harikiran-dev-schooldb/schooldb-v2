"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { subjectColumns } from "../columns";

import { useSubjectTable } from "../hooks/useSubjectTable";

import { SubjectToolbar } from "./SubjectToolbar";

export function SubjectTable() {
  const {
    subjects,
    loading,

    search,
    setSearch,
  } = useSubjectTable();

  return (
    <div className="space-y-4">
      <SubjectToolbar search={search} onSearch={setSearch} />

      <DataGrid columns={subjectColumns} data={subjects} loading={loading} />
    </div>
  );
}
