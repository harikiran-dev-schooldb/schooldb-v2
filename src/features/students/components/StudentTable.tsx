"use client";

import { useParams } from "next/navigation";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { useStudentTable } from "../hooks/useStudentTable";
import { StudentToolbar } from "./StudentToolbar";
import { AddStudentButton } from "./AddStudentButton";

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
      emptyTitle="No students found"
      emptyDescription={
        search || classId || sectionId
          ? "No student records match the current search and filters."
          : "Add the first student to begin building your school directory."
      }
      emptyAction={<AddStudentButton />}
      toolbar={
        <StudentToolbar
          search={search}
          onSearch={setSearch}
          status={status}
          onStatusChange={setStatus}
          classId={classId}
          onClassChange={setClassId}
          sectionId={sectionId}
          onSectionChange={setSectionId}
          exportHref={exportHref}
        />
      }
    />
  );
}
