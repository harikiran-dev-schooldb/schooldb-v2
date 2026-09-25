"use client";

import { useParams } from "next/navigation";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { teacherColumns } from "../columns";
import { useTeacherTable } from "../hooks/useTeacherTable";
import { TeacherToolbar } from "./TeacherToolbar";

export function TeacherTable() {
  const params = useParams<{ schoolSlug: string }>();
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

  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  const exportHref = `/api/v1/reports/${params.schoolSlug}/teachers${query.size ? `?${query.toString()}` : ""}`;

  return (
    <DataGrid
      columns={teacherColumns}
      data={teachers}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      toolbar={
        <TeacherToolbar
          search={search}
          onSearch={setSearch}
          exportHref={exportHref}
        />
      }
    />
  );
}
