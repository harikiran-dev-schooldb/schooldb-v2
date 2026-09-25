"use client";

import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      toolbar={\n        <div className="flex flex-col gap-3">\n          <div className="flex justify-end">\n            <Button asChild className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">\n              <a href={exportHref}><Download className="mr-2 size-4" />Export Excel</a>\n            </Button>\n          </div>\n          <TeacherToolbar search={search} onSearch={setSearch} />\n        </div>\n      }
    />
  );
}
