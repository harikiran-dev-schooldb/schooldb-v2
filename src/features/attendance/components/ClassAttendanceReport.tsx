"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  RefreshCcw,
  Users,
  UserX,
} from "lucide-react";

import { toast } from "sonner";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

type Props = {
  schoolSlug: string;
};

type StudentReport = {
  studentId: string;
  rollNo: number | null;
  admissionNo: string;
  fullName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendancePercentage: number;
};

type ReportData = {
  summary: {
    totalStudents: number;
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    attendancePercentage: number;
  };

  students: StudentReport[];
};

export function ClassAttendanceReport({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const canLoadReport =
    Boolean(academicYearId) && Boolean(classId) && Boolean(sectionId);

  const hasFilters =
    Boolean(academicYearId) ||
    Boolean(classId) ||
    Boolean(sectionId) ||
    Boolean(fromDate) ||
    Boolean(toDate);

  function changeAcademicYear(value: string) {
    setAcademicYearId(value);
    setClassId("");
    setSectionId("");
    setData(null);
  }

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
    setData(null);
  }

  function clearFilters() {
    setAcademicYearId("");
    setClassId("");
    setSectionId("");
    setFromDate("");
    setToDate("");
    setData(null);
  }

  useEffect(() => {
    if (!canLoadReport) {
      return;
    }

    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          academicYearId,
          classId,
          sectionId,
        });

        if (fromDate) {
          params.set("fromDate", fromDate);
        }

        if (toDate) {
          params.set("toDate", toDate);
        }

        const response = await fetch(
          `/api/v1/attendance/reports/class?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load class attendance.");
          setData(null);
          return;
        }

        setData(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load class attendance report.");
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
  }, [academicYearId, classId, sectionId, fromDate, toDate, canLoadReport]);

  function openStudent(studentId: string) {
    const params = new URLSearchParams({
      studentId,
      academicYearId,
    });

    router.push(
      `/${schoolSlug}/attendance/reports/student?${params.toString()}`,
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ================================================================ */}
      {/* Page Header                                                       */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" />

        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Class Attendance Report
                </h1>

                <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Analytics
                </span>
              </div>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                Analyze attendance performance, student-wise records, and
                overall attendance statistics for a class.
              </p>
            </div>
          </div>

          {data && (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm">
                <Users className="h-4 w-4 text-primary" />
              </div>

              <div>
                <p className="text-lg font-bold leading-none">
                  {data.summary.totalStudents}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Students in report
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================ */}
      {/* Filters                                                           */}
      {/* ================================================================ */}
      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">Report Filters</h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Select an academic year, class and section to generate the
                report.
              </p>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:self-auto"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
          {/* Academic Year */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Year
            </label>

            <AcademicYearSelect
              value={academicYearId}
              onChange={changeAcademicYear}
            />
          </div>

          {/* Class */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Class
            </label>

            <ClassSelect value={classId} onChange={changeClass} />
          </div>

          {/* Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Section
            </label>

            <SectionSelect
              classId={classId}
              value={sectionId}
              onChange={setSectionId}
              disabled={!classId}
            />
          </div>

          {/* From Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To Date
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Initial State                                                     */}
      {/* ================================================================ */}
      {!canLoadReport && (
        <section className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            Select a class to generate the report
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Choose an academic year, class and section to view complete
            attendance statistics and student-wise performance.
          </p>
        </section>
      )}

      {/* ================================================================ */}
      {/* Loading                                                           */}
      {/* ================================================================ */}
      {canLoadReport && loading && <ReportSkeleton />}

      {/* ================================================================ */}
      {/* Report                                                            */}
      {/* ================================================================ */}
      {canLoadReport && !loading && data && (
        <>
          {/* Summary */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryCard
              label="Students"
              value={data.summary.totalStudents}
              icon={<Users className="h-4 w-4" />}
            />

            <SummaryCard
              label="Sessions"
              value={data.summary.totalSessions}
              icon={<CalendarDays className="h-4 w-4" />}
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
              className="text-red-600"
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
              icon={<FileText className="h-4 w-4" />}
              className="text-blue-600"
            />

            <SummaryCard
              label="Attendance"
              value={`${data.summary.attendancePercentage}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              className="text-primary"
              highlight
            />
          </section>

          {/* Student Table */}
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">
                  Student Attendance Performance
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Detailed attendance summary for each student.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                {data.students.length} student
                {data.students.length !== 1 ? "s" : ""}
              </div>
            </div>

            {data.students.length === 0 ? (
              <div className="p-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>

                <p className="mt-4 font-medium">No students found</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  No student attendance data is available for the selected
                  filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        #
                      </th>

                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Student
                      </th>

                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Admission No.
                      </th>

                      <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total
                      </th>

                      <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Present
                      </th>

                      <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Absent
                      </th>

                      <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Late
                      </th>

                      <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Leave
                      </th>

                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Attendance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.students.map((student, index) => (
                      <tr
                        key={student.studentId}
                        className="group border-b transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-4 text-muted-foreground">
                          {student.rollNo ?? index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openStudent(student.studentId)}
                            className="group/student flex items-center gap-3 text-left"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold transition-colors group-hover/student:text-primary">
                                  {student.fullName}
                                </span>

                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover/student:translate-x-0.5 group-hover/student:opacity-100" />
                              </div>

                              <p className="mt-0.5 text-xs text-muted-foreground">
                                View individual report
                              </p>
                            </div>
                          </button>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                          {student.admissionNo}
                        </td>

                        <td className="px-5 py-4 text-center font-medium">
                          {student.total}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusCount
                            value={student.present}
                            className="bg-green-500/10 text-green-700 dark:text-green-400"
                          />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusCount
                            value={student.absent}
                            className="bg-red-500/10 text-red-700 dark:text-red-400"
                          />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusCount
                            value={student.late}
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusCount
                            value={student.leave}
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex min-w-[130px] items-center justify-end gap-3">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, student.attendancePercentage),
                                  )}%`,
                                }}
                              />
                            </div>

                            <span
                              className={[
                                "min-w-[48px] text-right font-bold",
                                getAttendanceClass(
                                  student.attendancePercentage,
                                ),
                              ].join(" ")}
                            >
                              {student.attendancePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
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
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        highlight ? "border-primary/30" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>

        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60",
            className,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <div className={`mt-3 text-2xl font-bold tracking-tight ${className}`}>
        {value}
      </div>
    </div>
  );
}

function StatusCount({
  value,
  className,
}: {
  value: number;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-w-9 items-center justify-center rounded-lg px-2 py-1 text-xs font-bold ${className}`}
    >
      {value}
    </span>
  );
}

function getAttendanceClass(percentage: number) {
  if (percentage >= 90) {
    return "text-green-600";
  }

  if (percentage >= 75) {
    return "text-primary";
  }

  if (percentage >= 60) {
    return "text-amber-600";
  }

  return "text-red-600";
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="h-[112px] animate-pulse rounded-2xl border bg-muted/40"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <div className="h-5 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
        </div>

        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
