"use client";

import { useState } from "react";
import { CalendarDays, GraduationCap } from "lucide-react";

import { useClassTimetable } from "../hooks/useClassTimetable";

import { TimetableFilters } from "./TimetableFilters";
import { TimetableGrid } from "./TimetableGrid";

export function ClassTimetable() {
  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const { data, loading } = useClassTimetable(
    academicYearId,
    classId,
    sectionId,
  );

  const ready =
    Boolean(academicYearId) && Boolean(classId) && Boolean(sectionId);

  function handleClassChange(value: string) {
    setClassId(value);
    setSectionId("");
  }

  return (
    <div className="space-y-5">
      {/* Filter panel */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-4.5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">Class Timetable</h2>

              <p className="text-xs text-muted-foreground">
                Select a class to view its weekly schedule.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <TimetableFilters
            academicYearId={academicYearId}
            classId={classId}
            sectionId={sectionId}
            onAcademicYearChange={setAcademicYearId}
            onClassChange={handleClassChange}
            onSectionChange={setSectionId}
          />
        </div>
      </div>

      {/* Empty */}
      {!ready && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <GraduationCap className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">Select a class</h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Choose the academic year, class and section to display the weekly
            timetable.
          </p>
        </div>
      )}

      {/* Loading */}
      {ready && loading && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />

          <p className="mt-4 text-sm font-medium">Loading timetable...</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Preparing the weekly schedule.
          </p>
        </div>
      )}

      {/* Grid */}
      {ready && !loading && <TimetableGrid data={data} />}
    </div>
  );
}
