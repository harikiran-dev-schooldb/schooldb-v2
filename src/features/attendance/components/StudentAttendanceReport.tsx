"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

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

  const loadReport = useCallback(async () => {
    if (!academicYearId || !studentId) {
      return;
    }

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
        `/api/v1/attendance/reports/student?${params}`,
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setData(result.data);
    } catch {
      toast.error("Failed to load attendance report.");
    } finally {
      setLoading(false);
    }
  }, [academicYearId, studentId, fromDate, toDate]);

  useEffect(() => {
    if (!academicYearId || !studentId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [academicYearId, studentId, loadReport]);

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
        return "bg-green-500/10 text-green-600";

      case "ABSENT":
        return "bg-red-500/10 text-red-600";

      case "LATE":
        return "bg-amber-500/10 text-amber-600";

      case "LEAVE":
        return "bg-blue-500/10 text-blue-600";
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Student Attendance Report</h1>

        <p className="text-sm text-muted-foreground">
          View attendance performance and attendance history for a student.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <AcademicYearSelect
            value={academicYearId}
            onChange={setAcademicYearId}
          />

          <StudentSelect value={studentId} onChange={setStudentId} />

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

      {/* Empty state */}
      {!academicYearId || !studentId ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <p className="font-medium">Select a student</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Select an academic year and student to view the attendance report.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading attendance report...
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
              icon={<UserCheck className="h-4 w-4" />}
              className="text-blue-600"
            />

            <SummaryCard
              label="Attendance"
              value={`${data.summary.attendancePercentage}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>

          {/* Records */}
          <div className="rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">Attendance Records</h2>

              <p className="text-sm text-muted-foreground">
                Detailed attendance history.
              </p>
            </div>

            {data.records.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No attendance records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Date</th>

                      <th className="px-4 py-3 font-medium">Type</th>

                      <th className="px-4 py-3 font-medium">Class</th>

                      <th className="px-4 py-3 font-medium">Subject</th>

                      <th className="px-4 py-3 font-medium">Period</th>

                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.records.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          {new Date(
                            record.session.attendanceDate,
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3">
                          {sessionTypeLabel(record.session.sessionType)}
                        </td>

                        <td className="px-4 py-3">
                          {record.session.class.name}
                          {" - "}
                          {record.session.section.name}
                        </td>

                        <td className="px-4 py-3">
                          {record.session.subject?.name ?? "-"}
                        </td>

                        <td className="px-4 py-3">
                          {record.session.period?.name ?? "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                              record.status,
                            )}`}
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
      ) : null}
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
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>

        <span className={className || "text-muted-foreground"}>{icon}</span>
      </div>

      <div className={`mt-2 text-2xl font-semibold ${className}`}>{value}</div>
    </div>
  );
}
