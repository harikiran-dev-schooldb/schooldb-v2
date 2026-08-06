"use client";

import { useState } from "react";

import { useClassTimetable } from "../hooks/useClassTimetable";

import { TimetableFilters } from "./TimetableFilters";
import { TimetableGrid } from "./TimetableGrid";

export function ClassTimetable() {
  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const { data } = useClassTimetable(academicYearId, classId, sectionId);

  return (
    <div className="space-y-6">
      <TimetableFilters
        academicYearId={academicYearId}
        classId={classId}
        sectionId={sectionId}
        onAcademicYearChange={setAcademicYearId}
        onClassChange={setClassId}
        onSectionChange={setSectionId}
      />

      <TimetableGrid data={data} />
    </div>
  );
}
