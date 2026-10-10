"use client";

import { ClearFiltersButton, CrudToolbar } from "@/components/common/crud";
import { AcademicBranchSelect } from "@/components/common/select/AcademicBranchSelect";
import { SyllabusSelect } from "@/components/common/select/SyllabusSelect";

type Props = {
  search: string;
  onSearch: (value: string) => void;
  syllabusId: string;
  branchId: string;
  onSyllabusChange: (value: string) => void;
  onBranchChange: (value: string) => void;
};

export function SectionToolbar({
  search,
  onSearch,
  syllabusId,
  branchId,
  onSyllabusChange,
  onBranchChange,
}: Props) {
  return (
    <CrudToolbar
      search={search}
      onSearch={onSearch}
      placeholder="Search sections..."
    >
      <SyllabusSelect
        allowAll
        value={syllabusId}
        onChange={onSyllabusChange}
        triggerClassName="h-10 w-full bg-background sm:w-44"
      />
      <AcademicBranchSelect
        allowAll
        syllabusId={syllabusId}
        value={branchId}
        onChange={onBranchChange}
        triggerClassName="h-10 w-full bg-background sm:w-48"
      />
      {search || syllabusId || branchId ? (
        <ClearFiltersButton
          onClick={() => {
            onSearch("");
            onSyllabusChange("");
            onBranchChange("");
          }}
        />
      ) : null}
    </CrudToolbar>
  );
}
