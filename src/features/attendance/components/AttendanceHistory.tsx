"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

import { useAttendanceHistory } from "../hooks/useAttendanceHistory";

type Props = {
  schoolSlug: string;
};

export function AttendanceHistory({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState("");
  const [locking, setLocking] = useState(false);

  const { data, loading } = useAttendanceHistory({
    academicYearId,
    classId,
    sectionId,
    date,
  });

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

  function openSession(sessionId: string) {
    router.push(`/${schoolSlug}/attendance/session/${sessionId}`);
  }

  function clearFilters() {
    setAcademicYearId("");
    setClassId("");
    setSectionId("");
    setDate("");
  }

  async function lockAllAttendance() {
    if (!academicYearId) {
      alert("Please select an academic year.");
      return;
    }

    if (!date) {
      alert("Please select an attendance date.");
      return;
    }

    try {
      setLocking(true);

      const response = await fetch("/api/v1/attendance/lock-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId,
          attendanceDate: date,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Failed to lock attendance sessions.",
        );
      }

      if (result?.data?.incompleteCount > 0) {
        alert(
          `${result.data.incompleteCount} attendance session(s) are incomplete. Please mark all students before locking.`,
        );

        return;
      }

      alert(result?.message ?? "All attendance sessions have been locked.");

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to lock attendance sessions.",
      );
    } finally {
      setLocking(false);
    }
  }

  function getSessionLabel(type: string) {
    switch (type) {
      case "DAILY":
        return "Daily";
      case "MORNING":
        return "Morning";
      case "AFTERNOON":
        return "Afternoon";
      case "PERIOD":
        return "Period";
      default:
        return type;
    }
  }

  const sessions = data?.data ?? [];

  const hasFilters =
    Boolean(academicYearId) ||
    Boolean(classId) ||
    Boolean(sectionId) ||
    Boolean(date);

  return (
    <div className="min-h-screen space-y-6 pb-10">
      {/* ================================================================ */}
      {/* Header */}
      {/* ================================================================ */}

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Attendance History
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                View, review and manage previously recorded attendance sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {date && academicYearId && !loading && sessions.length > 0 && (
              <Button
                type="button"
                onClick={lockAllAttendance}
                disabled={locking}
                className="gap-2"
              >
                {locking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                {locking ? "Locking..." : "Lock All Attendance"}
              </Button>
            )}

            {!loading && sessions.length > 0 && (
              <div className="rounded-xl border bg-muted/40 px-4 py-2 text-sm">
                <span className="font-semibold">{sessions.length}</span>{" "}
                <span className="text-muted-foreground">
                  {sessions.length === 1 ? "Session" : "Sessions"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Filters */}
      {/* ================================================================ */}

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Filter className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">Filters</h2>

              <p className="text-xs text-muted-foreground">
                Narrow down attendance sessions.
              </p>
            </div>
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AcademicYearSelect
            value={academicYearId}
            onChange={setAcademicYearId}
          />

          <ClassSelect value={classId} onChange={changeClass} />

          <SectionSelect
            classId={classId}
            value={sectionId}
            onChange={setSectionId}
          />

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label="Filter by attendance date"
            />
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Loading */}
      {/* ================================================================ */}

      {loading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading attendance history...
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Empty State */}
      {/* ================================================================ */}

      {!loading && sessions.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>

          <h3 className="font-semibold">No attendance records found</h3>

          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {hasFilters
              ? "No attendance sessions match the selected filters."
              : "There are no attendance sessions available yet."}
          </p>

          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Session List */}
      {/* ================================================================ */}

      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((item) => {
            const attendanceDate = new Date(
              item.attendanceDate,
            ).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={item.id}
                className="group rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  {/* ---------------------------------------------------- */}
                  {/* Session Information */}
                  {/* ---------------------------------------------------- */}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">
                        {item.className} - {item.sectionName}
                      </h3>

                      <span className="rounded-full border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {getSessionLabel(item.sessionType)}
                      </span>

                      {item.completed ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        <span>{attendanceDate}</span>
                      </div>

                      {item.subjectName && (
                        <span className="truncate">{item.subjectName}</span>
                      )}

                      {item.periodName && (
                        <span className="truncate">{item.periodName}</span>
                      )}

                      {item.teacherName && (
                        <span className="truncate">{item.teacherName}</span>
                      )}
                    </div>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* Statistics + Action */}
                  {/* ---------------------------------------------------- */}

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <div
                      title="Total Students"
                      className="flex min-w-[74px] items-center justify-center gap-1.5 rounded-xl border bg-muted/50 px-3 py-2 text-sm font-medium"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />

                      <span>{item.totalStudents}</span>
                    </div>

                    <div
                      title="Present"
                      className="flex min-w-[74px] items-center justify-center gap-1.5 rounded-xl bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />

                      <span>{item.present}</span>
                    </div>

                    <div
                      title="Absent"
                      className="flex min-w-[74px] items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
                    >
                      <XCircle className="h-4 w-4" />

                      <span>{item.absent}</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openSession(item.id)}
                      className="gap-2 sm:ml-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
