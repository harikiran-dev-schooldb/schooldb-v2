"use client";

import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { useStudentTable } from "../hooks/useStudentTable";
import { StudentToolbar } from "./StudentToolbar";

export function StudentTable() {
  const params = useParams<{ schoolSlug: string }>();
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
    classId,
    setClassId,
    sectionId,
    setSectionId,
  } = useStudentTable();

  const exportQuery = new URLSearchParams();
  if (search.trim()) exportQuery.set("search", search.trim());
  if (status) exportQuery.set("status", status);
  if (classId) exportQuery.set("classId", classId);
  if (sectionId) exportQuery.set("sectionId", sectionId);
  const exportHref = `/api/v1/reports/${params.schoolSlug}/students?${exportQuery.toString()}`;

  return (
    <DataGrid
      columns={studentColumns}
      data={students}
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
          <StudentToolbar
          search={search}
          onSearch={setSearch}
          status={status}
          onStatusChange={setStatus}
          classId={classId}
          onClassChange={setClassId}
          sectionId={sectionId}
          onSectionChange={setSectionId}
        />
        </div>
      }
    />
  );
}
