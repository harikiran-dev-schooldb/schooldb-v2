"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/school-context";
import { BulkAbsenteeMarker } from "./BulkAbsenteeMarker";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";
type Scope = "SCHOOL" | "SYLLABUS" | "BRANCH" | "CLASS" | "SECTION";

type Props = {
  academicYearId: string;
  attendanceDate: string;
  attendanceMode: AttendanceMode;
  scope: Scope;
  syllabusId: string;
  branchId: string;
  classId: string;
  sectionId: string;
  academicPathLabel: string;
};

export function AbsenteeSelectionPage(props: Props) {
  const { school } = useSchool();

  return (
    <div className="min-h-screen w-full space-y-6 bg-[linear-gradient(180deg,rgba(255,241,242,0.5),transparent_24rem)] p-4 pb-12 sm:p-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-rose-100 bg-white px-5 py-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-rose-500 uppercase">Prepared attendance draft</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Select absentees</h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">Everyone is currently present. Select exceptions, review them, and finalize the draft.</p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-fit rounded-xl">
          <Link href={`/${school.slug}/attendance`}>
            <ArrowLeft className="size-4" />
            Back to attendance setup
          </Link>
        </Button>
      </div>

      <BulkAbsenteeMarker {...props} prepared />
    </div>
  );
}
