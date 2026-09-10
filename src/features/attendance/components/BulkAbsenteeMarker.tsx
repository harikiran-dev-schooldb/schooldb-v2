"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Search, ShieldAlert, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";
type Scope = "SCHOOL" | "CLASS" | "SECTION";
type SessionChoice = "MORNING" | "AFTERNOON" | "BOTH";

type StudentOption = {
  id: string;
  label: string;
  admissionNo: string;
  fullName: string;
  imageUrl: string | null;
  className: string | null;
  sectionName: string | null;
  rollNo: number | null;
};

const ITEMS_PER_PAGE = 50;

type Props = {
  academicYearId: string;
  classId: string;
  sectionId: string;
  attendanceMode: AttendanceMode;
};

export function BulkAbsenteeMarker({
  academicYearId,
  classId,
  sectionId,
  attendanceMode,
}: Props) {
  const [scope, setScope] = useState<Scope>("SECTION");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recordedAbsentIds, setRecordedAbsentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sessionChoice, setSessionChoice] = useState<SessionChoice>("BOTH");
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scopeReady = Boolean(
    academicYearId &&
      (scope === "SCHOOL" || classId) &&
      (scope !== "SECTION" || sectionId),
  );

  useEffect(() => {
    function focusStudentSearch(event: KeyboardEvent) {
      const input = searchInputRef.current;

      if (
        input &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        input.focus();
        input.select();
      }
    }

    window.addEventListener("keydown", focusStudentSearch);
    return () => window.removeEventListener("keydown", focusStudentSearch);
  }, []);

  useEffect(() => {
    if (!scopeReady) {
      return;
    }

    const controller = new AbortController();

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        const params = new URLSearchParams({
          academicYearId,
          mode: "enrolled",
        });
        if (scope !== "SCHOOL") params.set("classId", classId);
        if (scope === "SECTION") params.set("sectionId", sectionId);

        const response = await fetch(`/api/v1/students/options?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load students.");
        }

        setStudents(result.data ?? []);
        setSelectedIds([]);
        setRecordedAbsentIds([]);
        setCurrentPage(1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStudents([]);
        toast.error(error instanceof Error ? error.message : "Unable to load students.");
      } finally {
        if (!controller.signal.aborted) setLoadingStudents(false);
      }
    }

    void loadStudents();
    return () => controller.abort();
  }, [academicYearId, classId, scope, scopeReady, sectionId]);

  const filteredStudents = useMemo(() => {
    if (!scopeReady) return [];
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [student.label, student.className, student.sectionName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [scopeReady, search, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, safeCurrentPage]);

  function toggleStudent(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : current.length < 500
          ? [...current, studentId]
          : current,
    );
  }

  function changeScope(nextScope: Scope) {
    setScope(nextScope);
    setStudents([]);
    setSelectedIds([]);
    setRecordedAbsentIds([]);
    setSearch("");
    setCurrentPage(1);
  }

  function requestConfirmation() {
    if (selectedIds.length === 0) {
      toast.error("Select at least one absent student.");
      return;
    }

    setConfirmOpen(true);
  }

  async function submit() {
    const submittedStudentIds = [...selectedIds];

    try {
      setSubmitting(true);
      const response = await fetch("/api/v1/attendance/bulk-absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          attendanceDate: new Date().toISOString().slice(0, 10),
          scope,
          classId: scope === "SCHOOL" ? undefined : classId,
          sectionId: scope === "SECTION" ? sectionId : undefined,
          studentIds: submittedStudentIds,
          sessionChoice:
            attendanceMode === "MORNING_AFTERNOON" ? sessionChoice : undefined,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to mark absentees.");
      }

      toast.success(
        `${result.data.studentCount} students marked absent across ${result.data.sessionCount} session${result.data.sessionCount === 1 ? "" : "s"}.`,
      );
      setConfirmOpen(false);
      setRecordedAbsentIds((current) => [
        ...new Set([...current, ...submittedStudentIds]),
      ]);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to mark absentees.");
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel =
    scope === "SCHOOL"
      ? "Whole school"
      : scope === "CLASS"
        ? "Selected class"
        : "Selected section";
  const attendanceLabel =
    attendanceMode === "MORNING_AFTERNOON"
      ? sessionChoice === "BOTH"
        ? "Morning & afternoon"
        : sessionChoice === "MORNING"
          ? "Morning only"
          : "Afternoon only"
      : attendanceMode === "EVERY_PERIOD"
        ? "Every scheduled period"
        : "Once daily";

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-rose-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50/70 to-white px-5 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
            <UserMinus className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Quick method</Badge>
              <h2 className="text-sm font-bold text-slate-900">Mark Absentees in Bulk</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Select absentees from a section, an entire class, or the whole school.</p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          {(["SCHOOL", "CLASS", "SECTION"] as const).map((item) => (
            <button key={item} type="button" onClick={() => changeScope(item)} className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition", scope === item ? "border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-600/15" : "border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700")}>{item === "SCHOOL" ? "Whole school" : item === "CLASS" ? "Selected class" : "Selected section"}</button>
          ))}
        </div>

        {attendanceMode === "MORNING_AFTERNOON" && (
          <div className="max-w-sm space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance session</p><Select value={sessionChoice} onValueChange={(value) => setSessionChoice(value as SessionChoice)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BOTH">Morning and afternoon</SelectItem><SelectItem value="MORNING">Morning only</SelectItem><SelectItem value="AFTERNOON">Afternoon only</SelectItem></SelectContent></Select></div>
        )}

        {attendanceMode === "EVERY_PERIOD" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Selected students will be marked absent for every scheduled period today within this scope.</div>
        )}

        {!scopeReady ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">{!academicYearId ? "Select an academic year first." : scope === "CLASS" ? "Select a class above." : "Select a class and section above."}</div>
        ) : (
          <>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input ref={searchInputRef} value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search all students by admission number or name" className="pl-9 pr-14" /><kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-400 sm:block">⌘F</kbd></div>

            {loadingStudents ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No enrolled students found.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {visibleStudents.map((student) => (
                    <AbsenteeStudentCard
                      key={student.id}
                      student={student}
                      selected={selectedIds.includes(student.id)}
                      recordedAbsent={recordedAbsentIds.includes(student.id)}
                      onToggle={() => toggleStudent(student.id)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-800">{visibleStudents.length}</span> of <span className="font-semibold text-slate-800">{filteredStudents.length}</span> students</p>
                    <div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft className="size-4" /></Button><span className="px-2 text-xs font-medium text-slate-500">Page {safeCurrentPage} of {totalPages}</span><Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight className="size-4" /></Button></div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-800"><Users className="size-4 text-amber-600" />{selectedIds.length} absent student{selectedIds.length === 1 ? "" : "s"} selected</span>
                {recordedAbsentIds.length > 0 && <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700"><CheckCircle2 className="size-3.5" />{recordedAbsentIds.length} recorded</span>}
              </div>
              <Button type="button" disabled={submitting || selectedIds.length === 0} onClick={requestConfirmation} className="bg-rose-600 text-white hover:bg-rose-700">{submitting ? "Marking..." : "Confirm & mark absent"}</Button>
            </div>
          </>
        )}
      </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!submitting) setConfirmOpen(open);
        }}
        eyebrow="Attendance confirmation"
        icon={ShieldAlert}
        tone="destructive"
        title={`Mark ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"} absent?`}
        description="Review this attendance update before applying it to today's register."
        details={[
          { label: "Scope", value: scopeLabel },
          { label: "Selected absent", value: `${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}` },
          { label: "Attendance", value: attendanceLabel },
          { label: "Date", value: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
        ]}
        consequence="Everyone else in this scope will be marked present. Any locked attendance sessions will remain unchanged."
        confirmLabel="Mark absent"
        pending={submitting}
        onConfirm={() => void submit()}
      />
    </>
  );
}

function AbsenteeStudentCard({
  student,
  selected,
  recordedAbsent,
  onToggle,
}: {
  student: StudentOption;
  selected: boolean;
  recordedAbsent: boolean;
  onToggle: () => void;
}) {
  const initials =
    student.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <Card
      role="button"
      tabIndex={recordedAbsent ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={recordedAbsent}
      onClick={() => {
        if (!recordedAbsent) onToggle();
      }}
      onKeyDown={(event) => {
        if (!recordedAbsent && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_6px_22px_rgba(15,23,42,0.035)] transition-all duration-200",
        recordedAbsent
          ? "cursor-default border-rose-300 border-t-2 border-t-rose-600 bg-rose-500/[0.045] ring-2 ring-rose-500/10"
          : selected
            ? "cursor-pointer border-amber-300 border-t-2 border-t-amber-500 bg-amber-500/[0.035] ring-2 ring-amber-500/10 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
            : "cursor-pointer border-t-2 border-t-slate-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold", recordedAbsent ? "bg-rose-100 text-rose-700" : selected ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>{initials}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{student.fullName}</p><p className="mt-0.5 text-[11px] text-slate-500">ID: {student.admissionNo}</p></div>
          </div>
          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border transition", recordedAbsent ? "border-rose-600 bg-rose-600 text-white" : selected ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 bg-white text-transparent")}><Check className="size-4" /></div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Roll No.</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{student.rollNo === null ? "—" : `#${student.rollNo}`}</p></div>
          <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Class</p><p className="mt-0.5 max-w-28 truncate text-xs font-semibold text-slate-700">{student.className ?? "—"}{student.sectionName ? ` · ${student.sectionName}` : ""}</p></div>
        </div>

        <div className={cn("mt-3 rounded-lg px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.12em]", recordedAbsent ? "bg-rose-100 text-rose-700" : selected ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-400")}>{recordedAbsent ? "Absent recorded" : selected ? "Selected for absence" : "Tap to mark absent"}</div>
      </CardContent>
    </Card>
  );
}
