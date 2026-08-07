"use client";

import { useState } from "react";

import { AcademicYearSelect, TeacherSelect } from "@/components/common/select";

import { useTeacherTimetable } from "../hooks/useTeacherTimetable";

import { TimetableGrid } from "./TimetableGrid";

export function TeacherTimetable() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const { data, loading } = useTeacherTimetable(academicYearId, teacherId);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
        />

        <TeacherSelect value={teacherId} onChange={setTeacherId} />
      </div>

      <TimetableGrid data={data} />
    </div>
  );
}
