"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Save,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { AttendanceSummary } from "./AttendanceSummary";
import { useAttendanceSession } from "../hooks/useAttendanceSession";
import { AttendanceHeader } from "./AttendanceHeader";
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

  /*
   * ------------------------------------------------------------------------
   * Local editing state
   * ------------------------------------------------------------------------
   *
   * We store only attendance changes here.
   *
   * When the session data arrives, students are derived from `data`.
   * This avoids synchronously copying props/API data into state inside
   * useEffect.
   */

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
   * Students
   * ------------------------------------------------------------------------
   */

  const serverStudents = useMemo(() => {
    if (!data?.students) {
      return [];
    }

    return mapStudents(data.students);
  }, [data]);

  /*
   * Use edited state when available.
   * Otherwise use the server data directly.
   */
  const students = editedStudents ?? serverStudents;

  /*
   * ------------------------------------------------------------------------
   * Ctrl + F / Cmd + F
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
    return {
      present: students.filter((student) => student.status === "PRESENT")
        .length,

      absent: students.filter((student) => student.status === "ABSENT").length,

      late: students.filter((student) => student.status === "LATE").length,

      leave: students.filter((student) => student.status === "LEAVE").length,
    };
  }, [students]);

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
   * Status update
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
   * Toggle Present / Absent
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

      /*
       * Keep the edited data as the new
       * local baseline.
       */
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
   * Loading state
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-xl border bg-card px-6 py-5 text-sm text-muted-foreground">
          Attendance session not found.
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Derived values
   * ------------------------------------------------------------------------
   */

  const allPresent =
    students.length > 0 &&
    students.every((student) => student.status === "PRESENT");

  return (
    <div className="min-h-screen space-y-6 pb-24">
      {/* Header */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Mark Attendance
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Mark student attendance for this session.
            </p>
          </div>
        </div>

        <AttendanceHeader
          className={data.session.class.name}
          section={data.session.section.name}
          subject={data.session.subject?.name ?? "-"}
          teacher={data.session.teacher?.fullName ?? "-"}
          period={data.session.period?.name ?? "-"}
          date={new Date(data.session.attendanceDate).toLocaleDateString()}
        />
      </div>

      {/* Summary */}
      <AttendanceSummary
        present={summary.present}
        absent={summary.absent}
        late={summary.late}
        leave={summary.leave}
      />

      {/* Student controls */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);

                setCurrentPage(1);
              }}
              placeholder="Search name or admission no..."
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-16 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              ⌘F
            </kbd>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllPresent}
              disabled={
                saving ||
                !editing ||
                students.length === 0 ||
                allPresent ||
                data.session.locked
              }
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Mark All Present
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllAbsent}
              disabled={
                saving ||
                !editing ||
                students.length === 0 ||
                data.session.locked
              }
              className="gap-2"
            >
              <UserX className="h-4 w-4" />
              Mark All Absent
            </Button>
          </div>
        </div>

        {/* Count */}
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <p className="text-sm text-muted-foreground">
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

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Student cards */}
      {students.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="font-medium">No students found</p>

          <p className="mt-1 text-sm text-muted-foreground">
            There are no students available for this attendance session.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

          <p className="font-medium">No students match your search</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Try searching by another name or admission number.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleStudents.map((student) => {
            const isPresent = student.status === "PRESENT";

            const isAbsent = student.status === "ABSENT";

            const isLate = student.status === "LATE";

            const isLeave = student.status === "LEAVE";

            return (
              <div
                key={student.studentId}
                role="button"
                tabIndex={saving || !editing || data.session.locked ? -1 : 0}
                onClick={() => {
                  if (saving || !editing || data.session.locked) {
                    return;
                  }

                  toggleStudent(student);
                }}
                onKeyDown={(event) => {
                  if (saving || !editing || data.session.locked) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();

                    toggleStudent(student);
                  }
                }}
                className={[
                  "group relative flex min-h-[145px] items-center rounded-xl border-2 p-4 text-left shadow-sm transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  "active:scale-[0.98]",

                  isPresent
                    ? "border-border bg-card hover:border-primary/40"
                    : "",

                  isAbsent ? "border-destructive/30 bg-destructive/5" : "",

                  isLate
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                    : "",

                  isLeave
                    ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Roll number */}
                <div className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  #{student.rollNo}
                </div>

                {/* Status icon */}
                <div
                  className={[
                    "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full",

                    isPresent
                      ? "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      : "",

                    isAbsent ? "bg-destructive/10 text-destructive" : "",

                    isLate ? "bg-amber-500/10 text-amber-600" : "",

                    isLeave ? "bg-blue-500/10 text-blue-600" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {isPresent && <Check className="h-4 w-4" />}

                  {isAbsent && <X className="h-4 w-4" />}

                  {isLate && <span className="text-xs font-bold">L</span>}

                  {isLeave && <span className="text-xs font-bold">LV</span>}
                </div>

                {/* Student */}
                <div className="flex min-w-0 items-center gap-3 pt-3">
                  <div
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",

                      isPresent
                        ? "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        : "",

                      isAbsent ? "bg-destructive/10 text-destructive" : "",

                      isLate ? "bg-amber-500/10 text-amber-600" : "",

                      isLeave ? "bg-blue-500/10 text-blue-600" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {student.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "truncate text-sm font-semibold",

                        isAbsent ? "text-destructive" : "text-foreground",
                      ].join(" ")}
                    >
                      {student.fullName}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      ID: {student.admissionNo}
                    </p>
                  </div>
                </div>

                {/* Status controls */}
                {editing && !data.session.locked ? (
                  <div
                    className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={isPresent ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          updateStatus(student.studentId, "PRESENT")
                        }
                        disabled={saving}
                      >
                        P
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={isAbsent ? "destructive" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          updateStatus(student.studentId, "ABSENT")
                        }
                        disabled={saving}
                      >
                        A
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={isLate ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => updateStatus(student.studentId, "LATE")}
                        disabled={saving}
                      >
                        L
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={isLeave ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => updateStatus(student.studentId, "LEAVE")}
                        disabled={saving}
                      >
                        LV
                      </Button>
                    </div>

                    <span
                      className={[
                        "text-[10px] font-bold uppercase tracking-wider",

                        isPresent ? "text-muted-foreground" : "",

                        isAbsent ? "text-destructive" : "",

                        isLate ? "text-amber-600" : "",

                        isLeave ? "text-blue-600" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {student.status}
                    </span>
                  </div>
                ) : (
                  <div className="absolute bottom-3 right-4">
                    <span
                      className={[
                        "text-[10px] font-bold uppercase tracking-wider",

                        isPresent ? "text-muted-foreground" : "",

                        isAbsent ? "text-destructive" : "",

                        isLate ? "text-amber-600" : "",

                        isLeave ? "text-blue-600" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {student.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredStudents.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium text-muted-foreground">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={safeCurrentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-20">
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur">
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{students.length} Students</p>

            <p className="text-xs text-muted-foreground">
              {summary.present} present · {summary.absent} absent
            </p>
          </div>

          {data.session.locked ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-muted/50 px-4 py-2 text-sm font-medium">
                🔒 Attendance Locked
              </div>
            </div>
          ) : !editing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={beginEditing}
              >
                Edit Attendance
              </Button>

              <Button
                type="button"
                size="lg"
                onClick={lockAttendance}
                disabled={saving || students.length === 0 || editing}
              >
                🔒 Lock Attendance
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="lg"
                onClick={saveAttendance}
                disabled={saving || students.length === 0}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
