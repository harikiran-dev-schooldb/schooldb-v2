"use client";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";
import { ClassSelect, SectionSelect } from "@/components/common/select";

type Props = {
  search: string;
  onSearch: (value: string) => void;
  classId: string;
  onClassChange: (value: string) => void;
  sectionId: string;
  onSectionChange: (value: string) => void;
};

export function StudentEnrollmentToolbar({
  search,
  onSearch,
  classId,
  onClassChange,
  sectionId,
  onSectionChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <DataGridSearch
        value={search}
        placeholder="Search enrollments..."
        onSearch={onSearch}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <ClassSelect
          value={classId}
          onChange={onClassChange}
          allowAll
          placeholder="All Classes"
          triggerClassName="h-10 min-w-40 rounded-xl"
        />
        <SectionSelect
          classId={classId}
          value={sectionId}
          onChange={onSectionChange}
          placeholder="All Sections"
          triggerClassName="h-10 min-w-40 rounded-xl"
        />
      </div>
    </div>
  );
}
