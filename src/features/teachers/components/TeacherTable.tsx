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
      toolbar={
        <div className="flex flex-col gap-3">
          <div className="flex justify-end px-1 pt-1">
            <Button asChild className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
              <a href={exportHref} className="inline-flex items-center"><Download className="mr-2 size-4" />Export Excel</a>
            </Button>
          </div>
          <TeacherToolbar search={search} onSearch={setSearch} />
        </div>
      }
    />
  );
}
