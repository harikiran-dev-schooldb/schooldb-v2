"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Loader2,
  LockKeyhole,
  Search,
  Save,
  UserCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useAttendanceSession } from "../hooks/useAttendanceSession";
import { AttendanceStatus } from "@/generated/prisma/enums";

type Props = {
  sessionId: string;
};

type StudentAttendance = {
  studentId: string;
  rollNo: number;
  admissionNo: string;
  fullName: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  remarks?: string;
};

const ITEMS_PER_PAGE = 50;

function mapStudents(
  students: NonNullable<
    ReturnType<typeof useAttendanceSession>["data"]
  >["students"],
): StudentAttendance[] {
  return students.map((student) => ({
    studentId: student.studentId,
    rollNo: student.rollNo,
    admissionNo: student.admissionNo,
    fullName: student.fullName,
    status: student.status,
    remarks: student.remarks ?? "",
  }));
}

export function MarkAttendance({ sessionId }: Props) {
  const { loading, data, reload } = useAttendanceSession(sessionId);

  const [editedStudents, setEditedStudents] = useState<
    StudentAttendance[] | null
  >(null);

  const [originalStudents, setOriginalStudents] = useState<
    StudentAttendance[] | null
  >(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  /*
   * ------------------------------------------------------------------------
   * Server students
   * ------------------------------------------------------------------------
   */

  const serverStudents = useMemo(() => {
    if (!data?.students) {
      return [];
    }

    return mapStudents(data.students);
  }, [data]);

  const students = editedStudents ?? serverStudents;

  /*
   * ------------------------------------------------------------------------
   * Keyboard search
   * ------------------------------------------------------------------------
   */

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();

        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /*
   * ------------------------------------------------------------------------
   * Begin editing
   * ------------------------------------------------------------------------
   */

  function beginEditing() {
    const snapshot = mapStudents(data?.students ?? []);

    setOriginalStudents(snapshot);
    setEditedStudents(snapshot);
    setCurrentPage(1);
    setEditing(true);
  }

  /*
   * ------------------------------------------------------------------------
   * Cancel editing
   * ------------------------------------------------------------------------
   */

  function cancelEditing() {
    setEditedStudents(originalStudents);
    setEditing(false);
    setCurrentPage(1);
  }

  /*
   * ------------------------------------------------------------------------
   * Summary
   * ------------------------------------------------------------------------
   */

  const summary = useMemo(() => {
    const present = students.filter(
      (student) => student.status === "PRESENT",
    ).length;

    const absent = students.filter(
      (student) => student.status === "ABSENT",
    ).length;

    const late = students.filter((student) => student.status === "LATE").length;

    const leave = students.filter(
      (student) => student.status === "LEAVE",
    ).length;

    const marked = present + absent + late + leave;

    const unmarked = Math.max(0, students.length - marked);

    return {
      total: students.length,
      marked,
      unmarked,
      present,
      absent,
      late,
      leave,
    };
  }, [students]);

  const isComplete = students.length > 0 && summary.marked === students.length;

  /*
   * ------------------------------------------------------------------------
   * Search
   * ------------------------------------------------------------------------
   */

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(query) ||
        student.admissionNo.toLowerCase().includes(query),
    );
  }, [students, searchQuery]);

  /*
   * ------------------------------------------------------------------------
   * Pagination
   * ------------------------------------------------------------------------
   */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / ITEMS_PER_PAGE),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visibleStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;

    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, safeCurrentPage]);

  /*
   * ------------------------------------------------------------------------
   * Update status
   * ------------------------------------------------------------------------
   */

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setEditedStudents((previous) => {
      const source = previous ?? serverStudents;

      return source.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              status,
            }
          : student,
      );
    });
  }

  /*
   * ------------------------------------------------------------------------
   * Toggle student
   * ------------------------------------------------------------------------
   */

  function toggleStudent(student: StudentAttendance) {
    updateStatus(
      student.studentId,
      student.status === "PRESENT" ? "ABSENT" : "PRESENT",
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Mark all present
   * ------------------------------------------------------------------------
   */

  function markAllPresent() {
    setEditedStudents((previous) => {
      const source = previous ?? serverStudents;

      return source.map((student) => ({
        ...student,
        status: "PRESENT",
      }));
    });
  }

  /*
   * ------------------------------------------------------------------------
   * Mark all absent
   * ------------------------------------------------------------------------
   */

  function markAllAbsent() {
    setEditedStudents((previous) => {
      const source = previous ?? serverStudents;

      return source.map((student) => ({
        ...student,
        status: "ABSENT",
      }));
    });
  }

  /*
   * ------------------------------------------------------------------------
   * Save attendance
   * ------------------------------------------------------------------------
   */

  async function saveAttendance() {
    const original = originalStudents ?? serverStudents;

    try {
      setSaving(true);

      const changes = students
        .filter((student) => {
          const originalStudent = original.find(
            (item) => item.studentId === student.studentId,
          );

          return (
            originalStudent &&
            (originalStudent.status !== student.status ||
              originalStudent.remarks !== student.remarks)
          );
        })
        .map((student) => ({
          studentId: student.studentId,
          status: student.status,
          remarks: student.remarks,
        }));

      if (changes.length === 0) {
        toast.info("No attendance changes to save.");

        setEditing(false);

        return;
      }

      const response = await fetch(
        `/api/v1/attendance/session/${sessionId}/correction`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            changes,
          }),
        },
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);

        return;
      }

      toast.success(
        `${changes.length} attendance ${
          changes.length === 1 ? "record" : "records"
        } updated successfully.`,
      );

      setOriginalStudents(students);
      setEditedStudents(students);
      setEditing(false);
    } catch {
      toast.error("Failed to update attendance.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * ------------------------------------------------------------------------
   * Lock attendance
   * ------------------------------------------------------------------------
   */

  async function lockAttendance() {
    if (!data?.session?.id) {
      return;
    }

    if (!isComplete) {
      toast.error(
        "Attendance cannot be locked until every student has a status.",
      );

      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/v1/attendance/session/${data.session.id}/lock`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);

        return;
      }

      toast.success("Attendance session locked successfully.");

      setEditing(false);
      setEditedStudents(null);
      setOriginalStudents(null);

      await reload();
    } catch {
      toast.error("Failed to lock attendance session.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * ------------------------------------------------------------------------
   * Loading
   * ------------------------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading attendance...
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Not found
   * ------------------------------------------------------------------------
   */

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">
            Attendance session not found.
          </div>
        </CardContent>
      </Card>
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Derived
   * ------------------------------------------------------------------------
   */

  const allPresent =
    students.length > 0 &&
    students.every((student) => student.status === "PRESENT");

  const attendanceDate = new Date(
    data.session.attendanceDate,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6 pb-10">
      {/* ================================================================ */}
      {/* Page Header */}
      {/* ================================================================ */}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />

          <h1 className="text-2xl font-bold tracking-tight">Mark Attendance</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Mark and manage student attendance for this session.
        </p>
      </div>

      {/* ================================================================ */}
      {/* Attendance Session */}
      {/* ================================================================ */}

      <Card
        className={cn(
          "overflow-hidden rounded-2xl",
          "border-border/60 bg-card",
          "shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
        )}
      >
        <div className="h-0.5 bg-primary/70" />

        <CardContent className="p-5">
          <div className="flex flex-col gap-5">
            {/* Top */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-4.5" strokeWidth={2} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight">
                      {data.session.class.name} - {data.session.section.name}
                    </h2>

                    {data.session.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
                        <LockKeyhole className="h-3 w-3" />
                        Locked
                      </span>
                    ) : isComplete ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready to Lock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
                        <Clock3 className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Attendance Register
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 px-4 py-2 text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Session Date
                </p>

                <p className="mt-0.5 text-sm font-semibold">{attendanceDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Completion Status */}
      {/* ================================================================ */}

      <Card
        className={cn(
          "overflow-hidden rounded-2xl",
          "border-border/60",
          "shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
          isComplete ? "bg-emerald-500/[0.035]" : "bg-amber-500/[0.035]",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  isComplete
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Clock3 className="size-5" />
                )}
              </div>

              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isComplete
                      ? "text-emerald-700 dark:text-emerald-500"
                      : "text-amber-700 dark:text-amber-500",
                  )}
                >
                  {isComplete
                    ? "Attendance is complete"
                    : "Attendance is incomplete"}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isComplete
                    ? `All ${students.length} students have an attendance status.`
                    : `${summary.unmarked} student${
                        summary.unmarked === 1 ? "" : "s"
                      } still need${
                        summary.unmarked === 1 ? "s" : ""
                      } an attendance status.`}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "hidden shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold sm:flex",
                isComplete
                  ? "border-emerald-200 bg-emerald-500/5 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
                  : "border-amber-200 bg-amber-500/5 text-amber-700 dark:border-amber-900 dark:text-amber-400",
              )}
            >
              <span>{summary.marked}</span>

              <span className="text-muted-foreground">/</span>

              <span>{students.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Summary */}
      {/* ================================================================ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Students"
          value={summary.total}
          description="Total enrolled students"
          icon={Users}
          iconClass="bg-slate-500/10 text-slate-600"
          accentClass="bg-slate-500"
        />

        <SummaryMetric
          label="Present"
          value={summary.present}
          description="Students marked present"
          icon={UserRoundCheck}
          iconClass="bg-emerald-500/10 text-emerald-600"
          accentClass="bg-emerald-500"
        />

        <SummaryMetric
          label="Absent"
          value={summary.absent}
          description="Students marked absent"
          icon={UserRoundX}
          iconClass="bg-red-500/10 text-red-600"
          accentClass="bg-red-500"
        />

        <SummaryMetric
          label="Unmarked"
          value={summary.unmarked}
          description="Students without a status"
          icon={Clock3}
          iconClass="bg-amber-500/10 text-amber-600"
          accentClass="bg-amber-500"
        />
      </div>

      {/* ================================================================ */}
      {/* Students */}
      {/* ================================================================ */}

      <Card
        className={cn(
          "overflow-hidden rounded-2xl",
          "border-border/60 bg-card",
          "shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
        )}
      >
        <div className="h-0.5 bg-primary/60" />

        <CardContent className="p-0">
          {/* Header */}
          <div className="border-b px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-4.5" />
                </div>

                <div>
                  <h2 className="font-semibold">Students</h2>

                  <p className="text-xs text-muted-foreground">
                    {summary.marked} of {summary.total} marked
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative w-full sm:w-[300px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search student or admission no..."
                    disabled={data.session.locked}
                    className="h-10 w-full rounded-xl border bg-muted/20 pl-9 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground sm:block">
                    ⌘F
                  </kbd>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={markAllPresent}
                  disabled={
                    saving || !editing || allPresent || data.session.locked
                  }
                  className="gap-2 rounded-xl"
                >
                  <UserCheck className="size-4" />
                  All Present
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={markAllAbsent}
                  disabled={saving || !editing || data.session.locked}
                  className="gap-2 rounded-xl"
                >
                  <UserRoundX className="size-4" />
                  All Absent
                </Button>
              </div>
            </div>
          </div>

          {/* Student Grid */}
          <div className="p-5">
            {students.length === 0 ? (
              <EmptyStudents />
            ) : filteredStudents.length === 0 ? (
              <NoSearchResults onClear={() => setSearchQuery("")} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {visibleStudents.map((student) => (
                    <StudentCard
                      key={student.studentId}
                      student={student}
                      editing={editing}
                      saving={saving}
                      locked={data.session.locked}
                      onToggle={() => toggleStudent(student)}
                      onStatusChange={updateStatus}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-between border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {visibleStudents.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-foreground">
                        {filteredStudents.length}
                      </span>{" "}
                      students
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg"
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                        disabled={safeCurrentPage === 1}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>

                      <span className="px-2 text-xs font-medium text-muted-foreground">
                        Page {safeCurrentPage} of {totalPages}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg"
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                        disabled={safeCurrentPage === totalPages}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Bottom Action */}
      {/* ================================================================ */}

      {!data.session.locked && (
        <Card
          className={cn(
            "rounded-2xl",
            "border-border/60 bg-card",
            "shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
          )}
        >
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  isComplete
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Clock3 className="size-5" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {isComplete ? "Attendance Complete" : "Attendance Pending"}
                </p>

                <p className="text-xs text-muted-foreground">
                  {summary.total} students · {summary.present} present ·{" "}
                  {summary.absent} absent
                  {summary.unmarked > 0 && ` · ${summary.unmarked} unmarked`}
                </p>
              </div>
            </div>

            {!editing ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={beginEditing}
                  disabled={saving}
                  className="gap-2 rounded-xl"
                >
                  <ClipboardCheck className="size-4" />
                  Edit Attendance
                </Button>

                <Button
                  type="button"
                  size="lg"
                  onClick={lockAttendance}
                  disabled={saving || !isComplete}
                  className="gap-2 rounded-xl"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}

                  {saving ? "Locking..." : "Lock Attendance"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="rounded-xl"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="lg"
                  onClick={saveAttendance}
                  disabled={saving || students.length === 0}
                  className="gap-2 rounded-xl"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Locked */}
      {/* ================================================================ */}

      {data.session.locked && (
        <Card className="rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <LockKeyhole className="size-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">Attendance Locked</p>

              <p className="text-xs text-muted-foreground">
                This attendance session is locked and cannot be modified.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ========================================================================= */
/* Summary Metric */
/* ========================================================================= */

type SummaryMetricProps = {
  label: string;
  value: number;
  description: string;
  icon: typeof Users;
  iconClass: string;
  accentClass: string;
};

function SummaryMetric({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
  accentClass,
}: SummaryMetricProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border-border/60 bg-card",
        "shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
        "transition-all duration-200",
        "hover:-translate-y-0.5",
        "hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]",
      )}
    >
      <div
        className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", accentClass)}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              "transition-transform duration-200",
              "group-hover:scale-105",
              iconClass,
            )}
          >
            <Icon className="size-4.5" strokeWidth={2} />
          </div>

          <p className="pt-1 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
        </div>

        <div className="mt-5">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value.toLocaleString("en-IN")}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================= */
/* Student Card */
/* ========================================================================= */

type StudentCardProps = {
  student: StudentAttendance;
  editing: boolean;
  saving: boolean;
  locked: boolean;
  onToggle: () => void;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
};

function StudentCard({
  student,
  editing,
  saving,
  locked,
  onToggle,
  onStatusChange,
}: StudentCardProps) {
  const isPresent = student.status === "PRESENT";

  const isAbsent = student.status === "ABSENT";

  const isLate = student.status === "LATE";

  const isLeave = student.status === "LEAVE";

  const initials =
    student.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <Card
      role={editing && !locked ? "button" : undefined}
      tabIndex={editing && !locked ? 0 : undefined}
      onClick={() => {
        if (saving || !editing || locked) {
          return;
        }

        onToggle();
      }}
      onKeyDown={(event) => {
        if (saving || !editing || locked) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border-border/60 bg-card",
        "shadow-[0_6px_22px_rgba(15,23,42,0.035)]",
        "transition-all duration-200",

        editing &&
          !locked &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]",

        isPresent && "border-t-2 border-t-emerald-400",

        isAbsent && "border-t-2 border-t-red-400 bg-red-500/[0.015]",

        isLate && "border-t-2 border-t-amber-400 bg-amber-500/[0.015]",

        isLeave && "border-t-2 border-t-blue-400 bg-blue-500/[0.015]",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                isPresent && "bg-emerald-500/10 text-emerald-600",
                isAbsent && "bg-red-500/10 text-red-600",
                isLate && "bg-amber-500/10 text-amber-600",
                isLeave && "bg-blue-500/10 text-blue-600",
              )}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {student.fullName}
              </p>

              <p className="mt-0.5 text-[11px] text-muted-foreground">
                ID: {student.admissionNo}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isPresent && (
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Check className="size-4" />
              </div>
            )}

            {isAbsent && (
              <div className="flex size-7 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                <X className="size-4" />
              </div>
            )}

            {isLate && (
              <div className="flex size-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <span className="text-[10px] font-bold">L</span>
              </div>
            )}

            {isLeave && (
              <div className="flex size-7 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                <span className="text-[9px] font-bold">LV</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Roll No.
            </p>

            <p className="mt-0.5 text-sm font-semibold">#{student.rollNo}</p>
          </div>

          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em]",

              isPresent && "bg-emerald-500/10 text-emerald-600",

              isAbsent && "bg-red-500/10 text-red-600",

              isLate && "bg-amber-500/10 text-amber-600",

              isLeave && "bg-blue-500/10 text-blue-600",
            )}
          >
            {student.status}
          </span>
        </div>

        {editing && !locked && (
          <div
            className="mt-3 flex gap-1 border-t pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <StatusButton
              label="P"
              active={isPresent}
              onClick={() => onStatusChange(student.studentId, "PRESENT")}
              disabled={saving}
              activeClass="bg-emerald-500 text-white hover:bg-emerald-600"
            />

            <StatusButton
              label="A"
              active={isAbsent}
              onClick={() => onStatusChange(student.studentId, "ABSENT")}
              disabled={saving}
              activeClass="bg-red-500 text-white hover:bg-red-600"
            />

            <StatusButton
              label="L"
              active={isLate}
              onClick={() => onStatusChange(student.studentId, "LATE")}
              disabled={saving}
              activeClass="bg-amber-500 text-white hover:bg-amber-600"
            />

            <StatusButton
              label="LV"
              active={isLeave}
              onClick={() => onStatusChange(student.studentId, "LEAVE")}
              disabled={saving}
              activeClass="bg-blue-500 text-white hover:bg-blue-600"
            />
          </div>
        )}

        {!editing && !locked && (
          <p className="mt-3 border-t pt-3 text-[10px] text-muted-foreground">
            Click Edit Attendance to modify
          </p>
        )}

        {locked && (
          <p className="mt-3 flex items-center gap-1 border-t pt-3 text-[10px] text-muted-foreground">
            <LockKeyhole className="size-3" />
            View only
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ========================================================================= */
/* Status Button */
/* ========================================================================= */

type StatusButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  activeClass: string;
};

function StatusButton({
  label,
  active,
  onClick,
  disabled,
  activeClass,
}: StatusButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-7 flex-1 rounded-lg px-2 text-[10px] font-bold",
        active && activeClass,
      )}
    >
      {label}
    </Button>
  );
}

/* ========================================================================= */
/* Empty states */
/* ========================================================================= */

function EmptyStudents() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
        <Users className="size-5 text-muted-foreground" />
      </div>

      <p className="font-medium">No students found</p>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        There are no students available for this attendance session.
      </p>
    </div>
  );
}

function NoSearchResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
        <Search className="size-5 text-muted-foreground" />
      </div>

      <p className="font-medium">No students match your search</p>

      <p className="mt-1 text-sm text-muted-foreground">
        Try another name or admission number.
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 rounded-xl"
        onClick={onClear}
      >
        Clear Search
      </Button>
    </div>
  );
}
