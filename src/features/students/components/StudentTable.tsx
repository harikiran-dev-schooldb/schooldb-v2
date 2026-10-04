"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { useStudentTable } from "../hooks/useStudentTable";
import { StudentToolbar } from "./StudentToolbar";
import { AddStudentButton } from "./AddStudentButton";
import { useSchool } from "@/contexts/school-context";

export function StudentTable() {
  const { role } = useSchool();
  const canManageStudents = ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"].includes(role);
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

  return (
    <DataGrid
      columns={canManageStudents
        ? studentColumns
        : studentColumns.filter((column) => column.id !== "actions")}
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
      emptyAction={canManageStudents ? <AddStudentButton /> : undefined}
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
        />
      }
    />
  );
}
