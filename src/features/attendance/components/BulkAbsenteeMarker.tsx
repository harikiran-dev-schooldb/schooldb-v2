"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Search, ShieldAlert, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
import { refreshTable } from "@/lib/table-event";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";
type Scope = "SCHOOL" | "SYLLABUS" | "BRANCH" | "CLASS" | "SECTION";
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
  syllabusId: string;
  branchId: string;
  attendanceMode: AttendanceMode;
  attendanceDate: string;
  scope: Scope;
  prepared: boolean;
  academicPathLabel: string;
};

export function BulkAbsenteeMarker({
  academicYearId,
  classId,
  sectionId,
  syllabusId,
  branchId,
  attendanceMode,
  attendanceDate,
  scope,
  prepared,
  academicPathLabel,
}: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recordedAbsentIds, setRecordedAbsentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [sessionChoice, setSessionChoice] = useState<SessionChoice>("BOTH");
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scopeReady = Boolean(
    prepared &&
      academicYearId &&
      (scope === "SCHOOL" || syllabusId) &&
      (!["BRANCH", "CLASS", "SECTION"].includes(scope) || branchId) &&
      (!["CLASS", "SECTION"].includes(scope) || classId) &&
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
          purpose: "attendance",
        });
        if (scope !== "SCHOOL") params.set("syllabusId", syllabusId);
        if (["BRANCH", "CLASS", "SECTION"].includes(scope)) {
          params.set("branchId", branchId);
        }
        if (["CLASS", "SECTION"].includes(scope)) params.set("classId", classId);
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
        setFinalized(false);
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
  }, [academicYearId, branchId, classId, scope, scopeReady, sectionId, syllabusId]);

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

  function requestConfirmation() {
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
          attendanceDate,
          scope,
          syllabusId: scope === "SCHOOL" ? undefined : syllabusId,
          branchId: ["BRANCH", "CLASS", "SECTION"].includes(scope)
            ? branchId
            : undefined,
          classId: ["CLASS", "SECTION"].includes(scope) ? classId : undefined,
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
        result.data.studentCount === 0
          ? `${result.data.sessionCount} attendance session${result.data.sessionCount === 1 ? "" : "s"} finalized with everyone present.`
          : `${result.data.studentCount} students marked absent and ${result.data.sessionCount} session${result.data.sessionCount === 1 ? "" : "s"} finalized.`,
      );
      refreshTable("attendance");
      setConfirmOpen(false);
      setRecordedAbsentIds((current) => [
        ...new Set([...current, ...submittedStudentIds]),
      ]);
      setSelectedIds([]);
      setFinalized(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to mark absentees.");
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel =
    scope === "SCHOOL"
      ? "Whole school"
      : scope === "SYLLABUS"
        ? "Selected syllabus"
        : scope === "BRANCH"
          ? "Selected branch"
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
  const attendanceDateLabel = new Date(`${attendanceDate}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric" },
  );

  return (
    <>
      <Card className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"><UserMinus className="size-4" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold tracking-wide text-white">STEP 2</span>
                <h2 className="text-base font-bold text-slate-900">Select absentees and finalize</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Choose any absent students from the prepared roster, then review and finalize once.</p>
            </div>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><CalendarDays className="size-3.5 text-indigo-500" />{attendanceDateLabel}</div>
        </div>

        <CardContent className="p-0">
          <div className="grid xl:grid-cols-[245px_1fr]">
            <aside className="border-b border-slate-200 bg-slate-50/60 p-5 xl:border-b-0 xl:border-r">
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Student scope</p>
              <div className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-3 shadow-sm ring-2 ring-rose-500/10">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-[9px] font-bold text-white">{scope === "SCHOOL" ? "ALL" : scope === "SYLLABUS" ? "SYL" : scope === "BRANCH" ? "BR" : scope === "CLASS" ? "CL" : "SEC"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-slate-800">{scopeLabel}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">{academicPathLabel}</span>
                  </span>
                  {prepared && <Check className="ml-auto size-3.5 text-emerald-600" />}
                </div>
              </div>

              {attendanceMode === "MORNING_AFTERNOON" && (
                <div className="mt-5 space-y-2"><p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">Session</p><Select value={sessionChoice} onValueChange={(value) => setSessionChoice(value as SessionChoice)}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BOTH">Morning and afternoon</SelectItem><SelectItem value="MORNING">Morning only</SelectItem><SelectItem value="AFTERNOON">Afternoon only</SelectItem></SelectContent></Select></div>
              )}
              {attendanceMode === "EVERY_PERIOD" && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[10px] leading-4 text-amber-800">Absence applies to every scheduled period on this date.</div>}
            </aside>

            <div className="min-w-0 p-5 md:p-6">
              {!scopeReady ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-5 text-center">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200"><Users className="size-5" /></div>
                  <p className="mt-3 text-sm font-bold text-slate-700">Complete Step 1 first</p>
                  <p className="mt-1 text-xs text-slate-500">Choose the date and scope, then mark the roster full present to prepare the draft.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-bold text-slate-900">Choose absentees</p><p className="mt-0.5 text-xs text-slate-500">Tap a student to add or remove them.</p></div>
                    <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input ref={searchInputRef} value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search name or admission no." className="h-10 rounded-xl bg-slate-50 pl-9 pr-14" /><kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-400 sm:block">⌘F</kbd></div>
                  </div>

                  {loadingStudents ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Loading students...</div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No enrolled students found.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {visibleStudents.map((student) => <AbsenteeStudentCard key={student.id} student={student} selected={selectedIds.includes(student.id)} recordedAbsent={recordedAbsentIds.includes(student.id)} disabled={finalized} onToggle={() => toggleStudent(student.id)} />)}
                      </div>
                      {totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-200 pt-4"><p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-800">{visibleStudents.length}</span> of <span className="font-semibold text-slate-800">{filteredStudents.length}</span></p><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft className="size-4" /></Button><span className="px-2 text-xs font-medium text-slate-500">{safeCurrentPage} / {totalPages}</span><Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight className="size-4" /></Button></div></div>}
                    </>
                  )}

                  <div className="flex flex-col gap-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-100"><span className="text-sm font-bold">{finalized ? recordedAbsentIds.length : selectedIds.length}</span></div><div><p className="text-sm font-bold text-slate-900">{finalized ? "Attendance finalized" : "Absent selected"}</p><p className="mt-0.5 text-[11px] text-slate-500">{finalized ? "This register is locked. Use Attendance History for corrections." : selectedIds.length === 0 ? "No absentees selected; everyone will remain present." : `${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"} will be marked absent.`}</p></div>{recordedAbsentIds.length > 0 && <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-rose-700"><CheckCircle2 className="size-3" />{recordedAbsentIds.length} recorded</span>}</div>
                    <Button type="button" disabled={finalized || submitting} onClick={requestConfirmation} className="h-10 rounded-xl bg-rose-600 px-5 font-semibold text-white shadow-lg shadow-rose-600/15 hover:bg-rose-700 disabled:opacity-40 disabled:shadow-none">{finalized ? "Finalized" : submitting ? "Finalizing..." : "Review & finalize"}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
        title={selectedIds.length === 0 ? "Finalize with everyone present?" : `Mark ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"} absent?`}
        description="Review this attendance update before applying it to the selected register."
        details={[
          { label: "Scope", value: scopeLabel },
          { label: "Selected absent", value: `${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}` },
          { label: "Attendance", value: attendanceLabel },
          { label: "Date", value: new Date(`${attendanceDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
        ]}
        consequence="Everyone else in this scope will be marked present. The completed registers will be locked and attendance notifications will be queued."
        confirmLabel="Mark absent & finalize"
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
  disabled,
  onToggle,
}: {
  student: StudentOption;
  selected: boolean;
  recordedAbsent: boolean;
  disabled: boolean;
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
      tabIndex={recordedAbsent || disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={recordedAbsent || disabled}
      onClick={() => {
        if (!recordedAbsent && !disabled) onToggle();
      }}
      onKeyDown={(event) => {
        if (!recordedAbsent && !disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group overflow-hidden rounded-xl border bg-white transition-all duration-200",
        disabled
          ? "cursor-default border-slate-200 bg-slate-50 opacity-65"
          : recordedAbsent
          ? "cursor-default border-rose-300 bg-rose-50/60 ring-2 ring-rose-500/10"
          : selected
            ? "cursor-pointer border-rose-300 bg-rose-50/50 shadow-sm ring-2 ring-rose-500/10"
            : "cursor-pointer border-slate-200 hover:border-slate-300 hover:shadow-md",
      )}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", recordedAbsent || selected ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>{initials}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{student.fullName}</p><p className="mt-0.5 text-[11px] text-slate-500">ID: {student.admissionNo}</p></div>
          </div>
          <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg border transition", recordedAbsent || selected ? "border-rose-600 bg-rose-600 text-white" : "border-slate-200 bg-white text-transparent")}><Check className="size-3.5" /></div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5 text-[10px] font-medium text-slate-500">
          <span>{student.rollNo === null ? "No roll number" : `Roll #${student.rollNo}`}</span>
          <span className="size-1 rounded-full bg-slate-300" />
          <span className="truncate">{student.className ?? "No class"}{student.sectionName ? ` · ${student.sectionName}` : ""}</span>
          {(selected || recordedAbsent) && <span className="ml-auto shrink-0 font-bold text-rose-600">{recordedAbsent ? "Recorded" : "Absent"}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
