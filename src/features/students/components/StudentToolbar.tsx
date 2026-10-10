"use client";

import { Filter } from "lucide-react";

import { DataGridSearch } from "@/components/datagrid/DataGridSearch";
import { ClearFiltersButton } from "@/components/common/crud";
import {
  AcademicBranchSelect,
  ClassSelect,
  SectionSelect,
  SyllabusSelect,
} from "@/components/common/select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentStatus } from "@/generated/prisma/client";

import { STUDENT_STATUS_OPTIONS } from "../constants/student-status";

type Props = {
  search: string;
  onSearch: (value: string) => void;

  status: StudentStatus;
  onStatusChange: (value: StudentStatus) => void;
  classId: string;
  onClassChange: (value: string) => void;
  sectionId: string;
  onSectionChange: (value: string) => void;
  syllabusId: string;
  onSyllabusChange: (value: string) => void;
  branchId: string;
  onBranchChange: (value: string) => void;
  gender: "ALL" | "MALE" | "FEMALE" | "OTHER";
  onGenderChange: (value: "ALL" | "MALE" | "FEMALE" | "OTHER") => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function StudentToolbar({
  search,
  onSearch,
  status,
  onStatusChange,
  classId,
  onClassChange,
  sectionId,
  onSectionChange,
  syllabusId,
  onSyllabusChange,
  branchId,
  onBranchChange,
  gender,
  onGenderChange,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  return (
    <div className="overflow-x-auto border-b border-border/70 bg-card p-3 sm:p-4 md:px-5">
      <div className="flex min-w-max items-center gap-2">
        <DataGridSearch
          placeholder="Search by name or admission number..."
          value={search}
          onSearch={onSearch}
        />

        <div className="flex shrink-0 items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <Filter className="size-3.5 text-primary" />
          Filters
        </div>

        <SyllabusSelect
          value={syllabusId}
          onChange={onSyllabusChange}
          allowAll
          triggerClassName="w-36 shrink-0"
        />

        <AcademicBranchSelect
          syllabusId={syllabusId}
          value={branchId}
          onChange={onBranchChange}
          allowAll
          triggerClassName="w-36 shrink-0"
        />

        <ClassSelect
          syllabusId={syllabusId}
          branchId={branchId}
          value={classId}
          onChange={onClassChange}
          allowAll
          placeholder="All Classes"
          triggerClassName="w-36 shrink-0"
        />

        <SectionSelect
          classId={classId}
          value={sectionId}
          onChange={onSectionChange}
          placeholder="All Sections"
          triggerClassName="w-36 shrink-0"
        />

        <div className="w-36 shrink-0">
          <Select
            value={gender}
            onValueChange={(value) =>
              onGenderChange(value as "ALL" | "MALE" | "FEMALE" | "OTHER")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All genders</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-36 shrink-0">
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as StudentStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Student status" />
            </SelectTrigger>

            <SelectContent>
              {STUDENT_STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters ? (
          <ClearFiltersButton onClick={onClearFilters} />
        ) : null}
      </div>
    </div>
  );
}
