"use client";

import { useState } from "react";

import { ClassSelect } from "@/components/common/select/ClassSelect";
import { AcademicBranchSelect } from "@/components/common/select/AcademicBranchSelect";
import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
import { SectionSelect } from "@/components/common/select/SectionSelect";
import { SyllabusSelect } from "@/components/common/select/SyllabusSelect";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AudienceType } from "./types";

type AudienceSelectorProps = {
  academicYearId: string | null;
  onReadyChange?: (
    ready: boolean,
    target: AudienceType,
    targetId: string,
  ) => void;
};

export function AudienceSelector({
  academicYearId,
  onReadyChange,
}: AudienceSelectorProps) {
  const [target, setTarget] = useState<AudienceType>("SCHOOL");

  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");

  const targetId =
    target === "SYLLABUS"
      ? syllabusId
      : target === "BRANCH"
        ? branchId
        : target === "CLASS"
      ? classId
      : target === "SECTION"
        ? sectionId
        : target === "STUDENT"
          ? studentId
          : "";

  function report(nextTarget: AudienceType, nextId: string) {
    const ready = nextTarget === "SCHOOL" || Boolean(nextId);

    onReadyChange?.(ready, nextTarget, nextId);
  }

  function changeTarget(value: AudienceType) {
    setTarget(value);

    setSyllabusId("");
    setBranchId("");
    setClassId("");
    setSectionId("");
    setStudentId("");

    report(value, "");
  }

  function changeSyllabus(value: string) {
    setSyllabusId(value);
    setBranchId("");
    setClassId("");
    setSectionId("");
    report(target, target === "SYLLABUS" ? value : "");
  }

  function changeBranch(value: string) {
    setBranchId(value);
    setClassId("");
    setSectionId("");
    report(target, target === "BRANCH" ? value : "");
  }

  function changeClass(value: string) {
    setClassId(value);

    report("CLASS", value);
  }

  function changeSectionClass(value: string) {
    setClassId(value);
    setSectionId("");

    // A section must still be selected before
    // the SECTION audience is ready.
    report("SECTION", "");
  }

  function changeSection(value: string) {
    setSectionId(value);

    report("SECTION", value);
  }

  function changeStudent(value: string) {
    setStudentId(value);

    report("STUDENT", value);
  }

  return (
    <>
      <div className="grid gap-2 text-sm font-medium">
        <span>Audience</span>

        <Select
          value={target}
          onValueChange={(value) => changeTarget(value as AudienceType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="SCHOOL">Whole school</SelectItem>

            <SelectItem value="SYLLABUS">Syllabus</SelectItem>

            <SelectItem value="BRANCH">Academic branch</SelectItem>

            <SelectItem value="CLASS">Class</SelectItem>

            <SelectItem value="SECTION">Section</SelectItem>

            <SelectItem value="STUDENT">Individual student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <input type="hidden" name="targetType" value={target} />

      <input type="hidden" name="targetId" value={targetId} />

      {target !== "SCHOOL" && target !== "STUDENT" && (
        <div className="grid gap-2 text-sm font-medium">
          <span>Syllabus</span>
          <SyllabusSelect value={syllabusId} onChange={changeSyllabus} />
        </div>
      )}

      {target !== "SCHOOL" &&
        target !== "SYLLABUS" &&
        target !== "STUDENT" && (
          <div className="grid gap-2 text-sm font-medium">
            <span>Academic branch</span>
            <AcademicBranchSelect
              syllabusId={syllabusId}
              value={branchId}
              onChange={changeBranch}
            />
          </div>
        )}

      {target === "CLASS" && (
        <div className="grid gap-2 text-sm font-medium">
          <span>Class</span>

          <ClassSelect
            syllabusId={syllabusId}
            branchId={branchId}
            value={classId}
            disabled={!branchId}
            onChange={changeClass}
          />
        </div>
      )}

      {target === "SECTION" && (
        <>
          <div className="grid gap-2 text-sm font-medium">
            <span>Class</span>

            <ClassSelect
              syllabusId={syllabusId}
              branchId={branchId}
              value={classId}
              disabled={!branchId}
              onChange={changeSectionClass}
            />
          </div>

          <div className="grid gap-2 text-sm font-medium">
            <span>Section</span>

            <SectionSelect
              classId={classId}
              value={sectionId}
              allowAll={false}
              onChange={changeSection}
            />
          </div>
        </>
      )}

      {target === "STUDENT" && (
        <div className="grid gap-2 text-sm font-medium">
          <span>Student</span>

          <SearchableStudentSelect
            value={studentId}
            onChange={changeStudent}
            academicYearId={academicYearId ?? undefined}
          />

          {!academicYearId && (
            <span className="text-xs text-destructive">
              Activate an academic year before selecting a student.
            </span>
          )}
        </div>
      )}
    </>
  );
}
