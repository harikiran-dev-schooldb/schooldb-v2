"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { classColumns } from "../columns";
import { useClassTable } from "../hooks/useSectionTable";
import { ClassToolbar } from "./SectionToolbar";

export function ClassTable() {
  const {
    classes,
    loading,

    page,
    setPage,

    totalPages,

    search,
    setSearch,
  } = useClassTable();

  return (
    <DataGrid
      columns={classColumns}
      data={classes}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={<ClassToolbar search={search} onSearch={setSearch} />}
    />
  );
}
