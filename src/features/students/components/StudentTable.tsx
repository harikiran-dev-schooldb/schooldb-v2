"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { useStudentTable } from "../hooks/useStudentTable";
import { StudentToolbar } from "./StudentToolbar";
import { AddStudentButton } from "./AddStudentButton";
import { useSchool } from "@/contexts/school-context";
import { hasModuleAccess } from "@/lib/staff-permissions";

export function StudentTable() {
  const { membership } = useSchool();
  const canManageStudents = hasModuleAccess(membership, "STUDENTS", "MANAGE");
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
    rteFilter,
    setRteFilter,
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
        search || classId || sectionId || rteFilter !== "ALL"
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
          rteFilter={rteFilter}
          onRteFilterChange={setRteFilter}
        />
      }
    />
  );
}
