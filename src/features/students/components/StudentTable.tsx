"use client";

import { DataGrid } from "@/components/datagrid/DataGrid";
import { studentColumns } from "../columns";
import { useStudentTable } from "../hooks/useStudentTable";
import { StudentToolbar } from "./StudentToolbar";
import { AddStudentButton } from "./AddStudentButton";
import { useSchool } from "@/contexts/school-context";
import { hasModuleAccess } from "@/lib/staff-permissions";
import {
  StudentStatus,
  STUDENT_STATUS_OPTIONS,
} from "../constants/student-status";

export function StudentTable() {
  const { membership } = useSchool();
  const canManageStudents = hasModuleAccess(membership, "STUDENTS", "MANAGE");
  const {
    students,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    search,
    setSearch,
    status,
    setStatus,
    classId,
    setClassId,
    sectionId,
    setSectionId,
    syllabusId,
    setSyllabusId,
    branchId,
    setBranchId,
    gender,
    setGender,
    rteFilter,
    setRteFilter,
  } = useStudentTable();
  const statusLabel = STUDENT_STATUS_OPTIONS.find(
    (option) => option.value === status,
  )?.label.toLowerCase() ?? "matching";
  const hasActiveFilters = Boolean(
    search || syllabusId || branchId || classId || sectionId ||
    gender !== "ALL" || rteFilter !== "ALL" || status !== StudentStatus.ACTIVE,
  );

  function clearFilters() {
    setSearch("");
    setSyllabusId("");
    setBranchId("");
    setClassId("");
    setSectionId("");
    setGender("ALL");
    setRteFilter("ALL");
    setStatus(StudentStatus.ACTIVE);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-foreground">
          {total.toLocaleString("en-IN")} {statusLabel} students
        </p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Count updates with search and filters
        </p>
      </div>

      <DataGrid
        columns={canManageStudents
          ? studentColumns
          : studentColumns.filter((column) => column.id !== "actions")}
        data={students}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={total}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No students found"
        emptyDescription={
          search || syllabusId || branchId || classId || sectionId ||
          gender !== "ALL" || rteFilter !== "ALL" || status !== "ACTIVE"
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
            syllabusId={syllabusId}
            onSyllabusChange={setSyllabusId}
            branchId={branchId}
            onBranchChange={setBranchId}
            classId={classId}
            onClassChange={setClassId}
            sectionId={sectionId}
            onSectionChange={setSectionId}
            gender={gender}
            onGenderChange={setGender}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        }
      />
    </div>
  );
}
