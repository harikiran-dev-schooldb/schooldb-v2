"use client";

import { useState } from "react";

import { ClassSelect } from "@/components/common/select/ClassSelect";
import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
import { SectionSelect } from "@/components/common/select/SectionSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AudienceType } from "./types";

export function AudienceSelector({
  academicYearId,
  onReadyChange,
}: {
  academicYearId: string | null;
  onReadyChange?: (ready: boolean, target: AudienceType) => void;
}) {
  const [target, setTarget] = useState<AudienceType>("SCHOOL");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const targetId = target === "CLASS" ? classId : target === "SECTION" ? sectionId : target === "STUDENT" ? studentId : "";

  function report(nextTarget: AudienceType, nextId: string) {
    onReadyChange?.(nextTarget === "SCHOOL" || Boolean(nextId), nextTarget);
  }

  function changeTarget(value: AudienceType) {
    setTarget(value);
    setClassId("");
    setSectionId("");
    setStudentId("");
    report(value, "");
  }

  return (
    <>
      <div className="grid gap-2 text-sm font-medium">
        <span>Audience</span>
        <Select value={target} onValueChange={(value) => changeTarget(value as AudienceType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SCHOOL">Whole school</SelectItem>
            <SelectItem value="CLASS">Class</SelectItem>
            <SelectItem value="SECTION">Section</SelectItem>
            <SelectItem value="STUDENT">Individual student</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <input type="hidden" name="targetType" value={target} />
      <input type="hidden" name="targetId" value={targetId} />

      {target === "CLASS" && (
        <div className="grid gap-2 text-sm font-medium">
          <span>Class</span>
          <ClassSelect value={classId} onChange={(value) => { setClassId(value); report(target, value); }} />
        </div>
      )}
      {target === "SECTION" && (
        <>
          <div className="grid gap-2 text-sm font-medium">
            <span>Class</span>
            <ClassSelect value={classId} onChange={(value) => { setClassId(value); setSectionId(""); report(target, ""); }} />
          </div>
          <div className="grid gap-2 text-sm font-medium">
            <span>Section</span>
            <SectionSelect classId={classId} value={sectionId} allowAll={false} onChange={(value) => { setSectionId(value); report(target, value); }} />
          </div>
        </>
      )}
      {target === "STUDENT" && (
        <div className="grid gap-2 text-sm font-medium">
          <span>Student</span>
          <SearchableStudentSelect value={studentId} onChange={(value) => { setStudentId(value); report(target, value); }} academicYearId={academicYearId ?? undefined} />
          {!academicYearId && <span className="text-xs text-destructive">Activate an academic year before selecting a student.</span>}
        </div>
      )}
    </>
  );
}
