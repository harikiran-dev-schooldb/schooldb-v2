"use client";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

type Props = {
  academicYearId: string;
  classId: string;
  sectionId: string;

  onAcademicYearChange: (value: string) => void;

  onClassChange: (value: string) => void;

  onSectionChange: (value: string) => void;
};

export function TimetableFilters({
  academicYearId,
  classId,
  sectionId,
  onAcademicYearChange,
  onClassChange,
  onSectionChange,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AcademicYearSelect
        value={academicYearId}
        onChange={onAcademicYearChange}
      />

      <ClassSelect value={classId} onChange={onClassChange} />

      <SectionSelect value={sectionId} onChange={onSectionChange} />
    </div>
  );
}
