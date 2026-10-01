"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { classColumns } from "../columns";
import { useClassTable } from "../hooks/useClassTable";
import { ClassToolbar } from "./ClassToolbar";

export function ClassTable() {
  const {
    classes,
    loading,

    page,
    setPage,

    totalPages,

    search,
    setSearch,
    syllabusId,
    setSyllabusId,
    branchId,
    setBranchId,
  } = useClassTable();

  return (
    <DataGrid
      columns={classColumns}
      data={classes}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={
        <ClassToolbar
          search={search}
          onSearch={setSearch}
          syllabusId={syllabusId}
          branchId={branchId}
          onSyllabusChange={setSyllabusId}
          onBranchChange={setBranchId}
        />
      }
    />
  );
}
