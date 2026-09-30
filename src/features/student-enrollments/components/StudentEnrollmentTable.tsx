"use client";

import { ArrowRight, CalendarRange, UsersRound } from "lucide-react";

import { DataGrid } from "@/components/datagrid/DataGrid";

import { studentEnrollmentColumns } from "../columns";

import { useStudentEnrollmentTable } from "../hooks/useStudentEnrollmentTable";

import { StudentEnrollmentToolbar } from "./StudentEnrollmentToolbar";

export function StudentEnrollmentTable() {
  const {
    enrollments,
    loading,

    page,
    setPage,

    totalPages,
    planning,

    search,
    setSearch,
    classId,
    setClassId,
    sectionId,
    setSectionId,
  } = useStudentEnrollmentTable();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
            <UsersRound className="size-4" /> Present students
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {planning.currentStudents.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Currently enrolled in {planning.currentAcademicYearName ?? "the active year"}
          </p>
        </div>

        <div className="hidden items-center justify-center px-2 text-primary md:flex">
          <ArrowRight className="size-6" />
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
            <CalendarRange className="size-4" /> Next-year plan
          </div>
          <p className="mt-2 text-lg font-black text-slate-950">
            {planning.nextAcademicYearName ?? "Next year not created"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Recommended class and section are shown for every current student.
          </p>
        </div>
      </div>

      <DataGrid
        columns={studentEnrollmentColumns}
        data={enrollments}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No present students found"
        emptyDescription="Add students to the active academic year before planning next-year enrollment."
        toolbar={
          <StudentEnrollmentToolbar
            search={search}
            onSearch={setSearch}
            classId={classId}
            onClassChange={setClassId}
            sectionId={sectionId}
            onSectionChange={setSectionId}
          />
        }
      />
    </div>
  );
}
