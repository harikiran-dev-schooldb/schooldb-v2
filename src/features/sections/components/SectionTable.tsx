"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { sectionColumns } from "../columns";
import { useSectionTable } from "../hooks/useSectionTable";
import { SectionToolbar } from "./SectionToolbar";

export function SectionTable() {
  const {
    sections,
    loading,

    page,
    setPage,

    totalPages,

    search,
    setSearch,
  } = useSectionTable();

  return (
    <DataGrid
      columns={sectionColumns}
      data={sections}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={<SectionToolbar search={search} onSearch={setSearch} />}
    />
  );
}
