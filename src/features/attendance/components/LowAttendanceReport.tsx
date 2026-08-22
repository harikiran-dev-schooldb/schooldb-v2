"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  CalendarDays,
  FileText,
  GraduationCap,
  ShieldAlert,
  Users,
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

type Student = {
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
  threshold: number;
  totalStudents: number;
  lowAttendanceCount: number;
  students: Student[];
};

export function LowAttendanceReport({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [threshold, setThreshold] = useState("75");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const canLoadReport = Boolean(academicYearId);

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
    setData(null);
  }

  function changeThreshold(value: string) {
    setThreshold(value);
    setData(null);
  }

  useEffect(() => {
    if (!canLoadReport) {
      return;
    }

    const parsedThreshold = Number(threshold);

    if (
      Number.isNaN(parsedThreshold) ||
      parsedThreshold < 0 ||
      parsedThreshold > 100
    ) {
      return;
    }

    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          academicYearId,
          threshold: String(parsedThreshold),
        });

        if (classId) {
          params.set("classId", classId);
        }

        if (sectionId) {
          params.set("sectionId", sectionId);
        }

        if (fromDate) {
          params.set("fromDate", fromDate);
        }

        if (toDate) {
          params.set("toDate", toDate);
        }

        const response = await fetch(
          `/api/v1/attendance/reports/low?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !result.success) {
          toast.error(result.message ?? "Failed to load report.");
          return;
        }

        setData(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load low attendance report.");
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
  }, [
    academicYearId,
    canLoadReport,
    classId,
    sectionId,
    fromDate,
    toDate,
    threshold,
  ]);

  function openStudent(studentId: string) {
    router.push(
      `/${schoolSlug}/attendance/reports/student?studentId=${studentId}&academicYearId=${academicYearId}`,
    );
  }

  const hasInvalidThreshold =
    threshold !== "" &&
    (Number.isNaN(Number(threshold)) ||
      Number(threshold) < 0 ||
      Number(threshold) > 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Low Attendance Report
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Identify students whose attendance requires attention.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Below selected threshold
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-sm font-medium">Report Filters</p>
            <p className="text-xs text-muted-foreground">
              Narrow the report by class, section, date, or attendance level.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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

          {/* From Date */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              aria-label="From date"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* To Date */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              aria-label="To date"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Threshold */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              %
            </span>

            <input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(event) => changeThreshold(event.target.value)}
              placeholder="Threshold"
              aria-label="Attendance threshold"
              className="h-10 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {hasInvalidThreshold && (
          <p className="mt-3 text-xs font-medium text-destructive">
            Threshold must be between 0 and 100.
          </p>
        )}
      </div>

      {/* Empty state */}
      {!canLoadReport ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="font-medium">Select an academic year</p>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Choose an academic year to identify students below the attendance
            threshold.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Loading low attendance report...
          </p>
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Students Evaluated"
              value={data.totalStudents}
              description="Students matching the selected filters"
              icon={<Users className="h-5 w-5" />}
            />

            <SummaryCard
              label="Requires Attention"
              value={data.lowAttendanceCount}
              description="Students below the attendance threshold"
              icon={<AlertTriangle className="h-5 w-5" />}
              className="text-red-600"
            />

            <SummaryCard
              label="Attendance Threshold"
              value={`${data.threshold}%`}
              description="Students below this percentage are listed"
              icon={<GraduationCap className="h-5 w-5" />}
              className="text-amber-600"
            />
          </div>

          {/* Students */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Students Below {data.threshold}% Attendance
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Review individual student attendance and take action where
                    required.
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-600">
                {data.lowAttendanceCount} Students
              </div>
            </div>

            {data.students.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <p className="font-medium">No low-attendance students</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  All students are meeting the selected attendance threshold.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-5 py-3 font-medium text-muted-foreground">
                        Student
                      </th>

                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Roll No
                      </th>

                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Admission No
                      </th>

                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Total
                      </th>

                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Present
                      </th>

                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Absent
                      </th>

                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Late
                      </th>

                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Leave
                      </th>

                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                        Attendance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.students.map((student) => (
                      <tr
                        key={student.studentId}
                        className="border-b transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openStudent(student.studentId)}
                            className="group flex items-center gap-3 text-left"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>

                            <span className="font-medium group-hover:text-primary group-hover:underline">
                              {student.fullName}
                            </span>
                          </button>
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {student.rollNo ?? "-"}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {student.admissionNo}
                        </td>

                        <td className="px-4 py-4 text-center">
                          {student.total}
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-green-600">
                          {student.present}
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-red-600">
                          {student.absent}
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-amber-600">
                          {student.late}
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-blue-600">
                          {student.leave}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex min-w-[68px] justify-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-600">
                            {student.attendancePercentage}%
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
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  className = "",
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>

          <p
            className={`mt-2 text-3xl font-semibold tracking-tight ${className}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${className}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
