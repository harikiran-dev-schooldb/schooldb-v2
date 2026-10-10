"use client";

import { Filter } from "lucide-react";
import { useState } from "react";

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

import { StudentDirectorySummary } from "./StudentDirectorySummary";

type GenderFilter = "ALL" | "MALE" | "FEMALE" | "OTHER";
type RteFilter = "ALL" | "RTE" | "NON_RTE";

export function StudentClassReport() {
  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [gender, setGender] = useState<GenderFilter>("ALL");
  const [rteFilter, setRteFilter] = useState<RteFilter>("ALL");
  const hasActiveFilters = Boolean(
    syllabusId || branchId || classId || sectionId ||
    gender !== "ALL" || rteFilter !== "ALL",
  );

  function clearFilters() {
    setSyllabusId("");
    setBranchId("");
    setClassId("");
    setSectionId("");
    setGender("ALL");
    setRteFilter("ALL");
  }

  return (
    <div className="space-y-4">
      <section className="premium-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Filter className="size-3.5 text-primary" />
            Report filters
          </div>
          {hasActiveFilters ? (
            <ClearFiltersButton onClick={clearFilters} />
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <SyllabusSelect
            value={syllabusId}
            onChange={(value) => {
              setSyllabusId(value);
              setBranchId("");
              setClassId("");
              setSectionId("");
            }}
            allowAll
          />

          <AcademicBranchSelect
            syllabusId={syllabusId}
            value={branchId}
            onChange={(value) => {
              setBranchId(value);
              setClassId("");
              setSectionId("");
            }}
            allowAll
          />

          <ClassSelect
            syllabusId={syllabusId}
            branchId={branchId}
            value={classId}
            onChange={(value) => {
              setClassId(value);
              setSectionId("");
            }}
            allowAll
            placeholder="All Classes"
          />

          <SectionSelect
            classId={classId}
            value={sectionId}
            onChange={setSectionId}
            placeholder="All Sections"
          />

          <Select
            value={gender}
            onValueChange={(value) => setGender(value as GenderFilter)}
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

          <Select
            value={rteFilter}
            onValueChange={(value) => setRteFilter(value as RteFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="RTE status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All students</SelectItem>
              <SelectItem value="RTE">RTE students</SelectItem>
              <SelectItem value="NON_RTE">Non-RTE students</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <StudentDirectorySummary
        syllabusId={syllabusId}
        branchId={branchId}
        classId={classId}
        sectionId={sectionId}
        gender={gender}
        rteFilter={rteFilter}
      />
    </div>
  );
}
