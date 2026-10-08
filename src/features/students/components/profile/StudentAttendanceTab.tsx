"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttendanceRecord = {
  id: string;
  status: string;
  session: {
    attendanceDate: string;

    class: {
      name: string;
    } | null;

    section: {
      name: string;
    } | null;

    subject: {
      name: string;
    } | null;

    period: {
      name: string;
    } | null;
  };
};

type MonthlyAttendance = {
  month: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  percentage: number;
};

type AttendanceData = {
  student: {
    id: string;
    admissionNo: string;
    fullName: string;
  };

  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;

  summary: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    percentage: number;
  };

  monthly: MonthlyAttendance[];

  records: AttendanceRecord[];
};

type Props = {
  studentId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function currentMonthKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function academicYearMonths(
  academicYear: AttendanceData["academicYear"],
) {
  if (!academicYear) return [];

  const startMonth = academicYear.startDate.slice(0, 7);
  const endMonth = academicYear.endDate.slice(0, 7);
  const cursor = new Date(`${startMonth}-01T00:00:00.000Z`);
  const end = new Date(`${endMonth}-01T00:00:00.000Z`);
  const months: string[] = [];

  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months.reverse();
}

function defaultAttendanceMonth(
  academicYear: AttendanceData["academicYear"],
) {
  const months = academicYearMonths(academicYear);
  const currentMonth = currentMonthKey();

  if (months.includes(currentMonth)) return currentMonth;
  if (months.length === 0) return currentMonth;

  const oldestMonth = months.at(-1) ?? currentMonth;
  const newestMonth = months[0] ?? currentMonth;

  if (currentMonth < oldestMonth) return oldestMonth;

  return newestMonth;
}

function getStatus(status: string) {
  switch (status) {
    case "PRESENT":
      return {
        label: "Present",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "LATE":
      return {
        label: "Late",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: Clock3,
      };

    case "ABSENT":
      return {
        label: "Absent",
        className: "border-rose-200 bg-rose-50 text-rose-700",
        icon: XCircle,
      };

    default:
      return {
        label: status,
        className: "border-slate-200 bg-slate-50 text-slate-600",
        icon: AlertCircle,
      };
  }
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>

            <p className={`mt-2 text-2xl font-bold ${className ?? ""}`}>
              {value}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>

          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentAttendanceTab({ studentId }: Props) {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/v1/students/${studentId}/attendance`,
          {
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (cancelled) return;

        if (!response.ok || !result.success) {
          console.error("Failed to load attendance:", result.message);

          setData(null);
          return;
        }

        setData(result.data);
        setSelectedMonth(defaultAttendanceMonth(result.data.academicYear));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load student attendance:", error);

          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const sortedRecords = useMemo(() => {
    if (!data) return [];

    return data.records
      .filter(
        (record) =>
          selectedMonth === "all" ||
          record.session.attendanceDate.slice(0, 7) === selectedMonth,
      )
      .sort(
      (a, b) =>
        new Date(b.session.attendanceDate).getTime() -
        new Date(a.session.attendanceDate).getTime(),
      );
  }, [data, selectedMonth]);

  const monthOptions = useMemo(() => {
    if (!data) return [];

    const yearMonths = academicYearMonths(data.academicYear);
    const recordedMonths = data.records.map((record) =>
      record.session.attendanceDate.slice(0, 7),
    );

    return Array.from(new Set([...yearMonths, ...recordedMonths])).sort((a, b) =>
      b.localeCompare(a),
    );
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <AlertCircle className="size-7 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">Attendance unavailable</h3>

          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Attendance records could not be loaded for this student.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserCheck className="size-5" />
                </div>

                <div>
                  <h2 className="font-semibold">Attendance Overview</h2>

                  <p className="text-xs text-muted-foreground">
                    Attendance record for {data.student.fullName}
                  </p>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="w-fit">
              {data.student.admissionNo}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Attendance"
          value={`${data.summary.percentage}%`}
          description="Overall attendance"
          icon={TrendingUp}
          className={
            data.summary.percentage >= 75 ? "text-emerald-600" : "text-rose-600"
          }
        />

        <SummaryCard
          title="Present"
          value={data.summary.presentDays}
          description={`${data.summary.workingDays} working days`}
          icon={CheckCircle2}
          className="text-emerald-600"
        />

        <SummaryCard
          title="Absent"
          value={data.summary.absentDays}
          description="Days absent"
          icon={XCircle}
          className="text-rose-600"
        />

        <SummaryCard
          title="Late"
          value={data.summary.lateDays}
          description="Late attendance days"
          icon={Clock3}
          className="text-amber-600"
        />
      </div>

      {/* Monthly Summary */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-5 text-primary" />
            Monthly Attendance
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {data.monthly.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No monthly attendance data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="px-5 py-3 text-left font-medium">Month</th>

                    <th className="px-5 py-3 text-center font-medium">
                      Working
                    </th>

                    <th className="px-5 py-3 text-center font-medium">
                      Present
                    </th>

                    <th className="px-5 py-3 text-center font-medium">
                      Absent
                    </th>

                    <th className="px-5 py-3 text-center font-medium">Late</th>

                    <th className="px-5 py-3 text-right font-medium">%</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {data.monthly.map((month) => (
                    <tr
                      key={month.month}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-4 font-medium">
                        {formatMonth(month.month)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        {month.workingDays}
                      </td>

                      <td className="px-5 py-4 text-center font-semibold text-emerald-600">
                        {month.presentDays}
                      </td>

                      <td className="px-5 py-4 text-center font-semibold text-rose-600">
                        {month.absentDays}
                      </td>

                      <td className="px-5 py-4 text-center font-semibold text-amber-600">
                        {month.lateDays}
                      </td>

                      <td className="px-5 py-4 text-right font-bold">
                        {month.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Records */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardHeader className="gap-4 border-b bg-muted/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-5 text-primary" />
              Attendance History
            </CardTitle>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Detailed attendance sessions for this student
              {data.academicYear ? ` in ${data.academicYear.name}` : ""}.
            </p>
          </div>

          <div className="w-full sm:w-[220px]">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Attendance month
            </p>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose month" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {sortedRecords.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
              <CalendarDays className="size-8 text-muted-foreground" />

              <p className="mt-3 font-medium">No attendance records</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {selectedMonth === "all"
                  ? "Attendance has not been recorded for this student."
                  : `No sessions were recorded in ${formatMonth(selectedMonth)}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="px-5 py-3 text-left font-medium">Date</th>

                    <th className="px-5 py-3 text-left font-medium">Class</th>

                    <th className="px-5 py-3 text-left font-medium">Section</th>

                    <th className="px-5 py-3 text-left font-medium">Subject</th>

                    <th className="px-5 py-3 text-left font-medium">Period</th>

                    <th className="px-5 py-3 text-center font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {sortedRecords.map((record) => {
                    const status = getStatus(record.status);
                    const StatusIcon = status.icon;

                    return (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-5 py-4 whitespace-nowrap font-medium">
                          {formatDate(record.session.attendanceDate)}
                        </td>

                        <td className="px-5 py-4">
                          {record.session?.class?.name ?? "-"}
                        </td>

                        <td className="px-5 py-4">
                          {record.session?.section?.name ?? "-"}
                        </td>

                        <td className="px-5 py-4">
                          {record.session?.subject?.name ?? "—"}
                        </td>

                        <td className="px-5 py-4">
                          {record.session?.period?.name ?? "-"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                          >
                            <StatusIcon className="size-3.5" />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
