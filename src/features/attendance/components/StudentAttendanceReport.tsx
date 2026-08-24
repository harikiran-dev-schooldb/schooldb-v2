"use client";

import { useEffect, useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  UserCheck,
  UserX,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { AcademicYearSelect } from "@/components/common/select/AcademicYearSelect";
import { StudentSelect } from "@/components/common/select/StudentSelect";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

type AttendanceRecord = {
  id: string;
  status: AttendanceStatus;

  session: {
    attendanceDate: string;

    sessionType: "DAILY" | "MORNING" | "AFTERNOON" | "PERIOD";

    class: {
      name: string;
    };

    section: {
      name: string;
    };

    subject?: {
      name: string;
    } | null;

    period?: {
      name: string;
    } | null;

    teacher?: {
      fullName: string;
    } | null;
  };
};

type ReportData = {
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    attendancePercentage: number;
  };

  records: AttendanceRecord[];
};

export function StudentAttendanceReport() {
  const [academicYearId, setAcademicYearId] = useState("");

  const [studentId, setStudentId] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [data, setData] = useState<ReportData | null>(null);

  const [loading, setLoading] = useState(false);

  /*
   * ------------------------------------------------------------------------
   * Filters
   * ------------------------------------------------------------------------
   */

  const hasRequiredFilters = Boolean(academicYearId && studentId);

  const hasFilters =
    Boolean(academicYearId) ||
    Boolean(studentId) ||
    Boolean(fromDate) ||
    Boolean(toDate);

  /*
   * ------------------------------------------------------------------------
   * Load report
   * ------------------------------------------------------------------------
   */

  useEffect(() => {
    if (!academicYearId || !studentId) {
      return;
    }

    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          academicYearId,
          studentId,
        });

        if (fromDate) {
          params.set("fromDate", fromDate);
        }

        if (toDate) {
          params.set("toDate", toDate);
        }

        const response = await fetch(
          `/api/v1/attendance/reports/student?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load attendance report.");
          setData(null);
          return;
        }

        setData(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load attendance report.");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [academicYearId, studentId, fromDate, toDate]);

  /*
   * ------------------------------------------------------------------------
   * Clear filters
   * ------------------------------------------------------------------------
   */

  function clearFilters() {
    setAcademicYearId("");
    setStudentId("");
    setFromDate("");
    setToDate("");
    setData(null);
  }

  /*
   * ------------------------------------------------------------------------
   * Academic year change
   * ------------------------------------------------------------------------
   *
   * Resetting dependent UI state belongs to the
   * event handler, not an effect.
   */

  function handleAcademicYearChange(value: string) {
    setAcademicYearId(value);
    setStudentId("");
    setData(null);
  }

  /*
   * ------------------------------------------------------------------------
   * Status helpers
   * ------------------------------------------------------------------------
   */

  function statusLabel(status: AttendanceStatus) {
    switch (status) {
      case "PRESENT":
        return "Present";

      case "ABSENT":
        return "Absent";

      case "LATE":
        return "Late";

      case "LEAVE":
        return "Leave";
    }
  }

  function statusClass(status: AttendanceStatus) {
    switch (status) {
      case "PRESENT":
        return "border-green-500/20 bg-green-500/10 text-green-600";

      case "ABSENT":
        return "border-destructive/20 bg-destructive/10 text-destructive";

      case "LATE":
        return "border-amber-500/20 bg-amber-500/10 text-amber-600";

      case "LEAVE":
        return "border-blue-500/20 bg-blue-500/10 text-blue-600";
    }
  }

  function sessionTypeLabel(type: AttendanceRecord["session"]["sessionType"]) {
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

  return (
    <div className="min-h-screen space-y-6 pb-10">
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Student Attendance Report
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Review attendance performance and detailed attendance history
                for an individual student.
              </p>
            </div>
          </div>

          {data && (
            <div className="rounded-xl border bg-muted/40 px-4 py-2 text-sm">
              <span className="font-semibold">{data.records.length}</span>{" "}
              <span className="text-muted-foreground">
                {data.records.length === 1 ? "Record" : "Records"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTERS                                                      */}
      {/* ============================================================ */}

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Filter className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">Report Filters</h2>

              <p className="text-xs text-muted-foreground">
                Select an academic year and student to generate the report.
              </p>
            </div>
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <AcademicYearSelect
            value={academicYearId}
            onChange={handleAcademicYearChange}
          />

          <StudentSelect
            value={studentId}
            onChange={setStudentId}
            academicYearId={academicYearId}
          />

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* INITIAL EMPTY STATE                                          */}
      {/* ============================================================ */}

      {!hasRequiredFilters && (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <UserCheck className="h-6 w-6 text-muted-foreground" />
          </div>

          <h3 className="font-semibold">Select a student</h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Select an academic year and student to view attendance statistics
            and detailed attendance records.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* LOADING                                                      */}
      {/* ============================================================ */}

      {hasRequiredFilters && loading && (
        <div className="flex min-h-[280px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading attendance report...
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REPORT                                                       */}
      {/* ============================================================ */}

      {hasRequiredFilters && !loading && data && (
        <>
          {/* ------------------------------------------------------ */}
          {/* SUMMARY                                                */}
          {/* ------------------------------------------------------ */}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              label="Total"
              value={data.summary.total}
              icon={<FileText className="h-4 w-4" />}
            />

            <SummaryCard
              label="Present"
              value={data.summary.present}
              icon={<CheckCircle2 className="h-4 w-4" />}
              className="text-green-600"
            />

            <SummaryCard
              label="Absent"
              value={data.summary.absent}
              icon={<UserX className="h-4 w-4" />}
              className="text-destructive"
            />

            <SummaryCard
              label="Late"
              value={data.summary.late}
              icon={<Clock className="h-4 w-4" />}
              className="text-amber-600"
            />

            <SummaryCard
              label="Leave"
              value={data.summary.leave}
              icon={<UserCheck className="h-4 w-4" />}
              className="text-blue-600"
            />

            <SummaryCard
              label="Attendance"
              value={`${data.summary.attendancePercentage}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              className="text-primary"
            />
          </div>

          {/* ------------------------------------------------------ */}
          {/* RECORDS                                                 */}
          {/* ------------------------------------------------------ */}

          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Attendance Records</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Detailed attendance history for the selected period.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
                <span className="font-semibold">{data.records.length}</span>{" "}
                <span className="text-muted-foreground">Records</span>
              </div>
            </div>

            {data.records.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="font-medium">No attendance records found</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  No records are available for the selected date range.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Date
                      </th>

                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Session
                      </th>

                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Class
                      </th>

                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Subject
                      </th>

                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Period
                      </th>

                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.records.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-medium">
                          {new Date(
                            record.session.attendanceDate,
                          ).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">
                            {sessionTypeLabel(record.session.sessionType)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {record.session.class.name}

                          <span className="mx-1 text-muted-foreground">-</span>

                          {record.session.section.name}
                        </td>

                        <td className="px-5 py-4">
                          {record.session.subject?.name ?? "-"}
                        </td>

                        <td className="px-5 py-4">
                          {record.session.period?.name ?? "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                              statusClass(record.status),
                            ].join(" ")}
                          >
                            {statusLabel(record.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>

        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg bg-muted",
            className,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <p
        className={[
          "mt-3 text-2xl font-bold tracking-tight",
          className || "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
