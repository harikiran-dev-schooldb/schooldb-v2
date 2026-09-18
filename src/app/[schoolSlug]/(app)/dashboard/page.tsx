"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cake,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GraduationCap,
  IndianRupee,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/school-context";
import { hasPermission, PERMISSIONS } from "@/lib/access-control";

/* ==========================================================================
   TYPES
   ========================================================================== */

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type AcademicYear = {
  id: string;
  name: string;
  active?: boolean;
};

type PaginatedResult = {
  total: number;
};

type AttendanceDashboard = {
  summary: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    attendancePercentage: number;
  };

  recentSessions: Array<{
    id: string;
    attendanceDate: string;
    sessionType: string;
    className: string;
    sectionName: string;
    totalStudents: number;
    present: number;
    absent: number;
    completed: boolean;
  }>;

  alerts: {
    lowAttendanceCount: number;
    threshold: number;
  };
};

type FeeDashboard = {
  summary: {
    totalPayable: number;
    totalPaid: number;
    outstanding: number;
    pendingCount: number;
    partialCount: number;
    paidCount: number;
    waivedCount: number;
    installmentCount: number;
  };

  collection: {
    today: number;
    todayPaymentCount: number;
    thisMonth: number;
    thisMonthPaymentCount: number;
  };

  recentPayments: Array<{
    id: string;
    receiptNo: string | null;
    paymentDate: string;
    amount: number | string;
    paymentMode: string;
    studentEnrollment: {
      student: {
        admissionNo: string | null;
        fullName: string;
      };
      class: {
        name: string;
      };
      section: {
        name: string;
      };
    };
  }>;
};

type LowAttendanceRow = {
  studentId: string;
  rollNo: number | string | null;
  admissionNo: string | null;
  fullName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendancePercentage: number;
};

type OutstandingRow = {
  id: string;
  installmentName: string;
  dueDate: string;
  outstanding: number;
  status: string;

  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };
};

type HouseSummary = {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  _count: { students: number };
};
type BirthdaySummary = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  imageUrl: string | null;
  whatsappOptIn: boolean;
  enrollments: Array<{ class: { name: string }; section: { name: string } }>;
};

type DashboardData = {
  academicYear: AcademicYear | null;
  students: number;
  teachers: number;
  classes: number;
  attendance: AttendanceDashboard | null;
  fees: FeeDashboard | null;
  lowAttendance: LowAttendanceRow[];
  outstanding: OutstandingRow[];
  houses: HouseSummary[];
  birthdays: BirthdaySummary[];
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  academicYear: null,
  students: 0,
  teachers: 0,
  classes: 0,
  attendance: null,
  fees: null,
  lowAttendance: [],
  outstanding: [],
  houses: [],
  birthdays: [],
};

/* ==========================================================================
   API
   ========================================================================== */

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
  });

  const result = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load dashboard data.");
  }

  return result.data;
}

async function fetchDashboardData(
  signal: AbortSignal,
  access: { attendance: boolean; fees: boolean; staff: boolean },
): Promise<DashboardData> {
  const [academicYears, students, teachers, classes, attendance] =
    await Promise.all([
      getJson<{
        data: AcademicYear[];
        total: number;
      }>("/api/v1/academic-years?page=1&pageSize=100", signal),

      getJson<PaginatedResult>("/api/v1/students?page=1&pageSize=1", signal),

      access.staff
        ? getJson<PaginatedResult>("/api/v1/teachers?page=1&pageSize=1", signal)
        : Promise.resolve(null),

      getJson<PaginatedResult>("/api/v1/classes?page=1&pageSize=1", signal),

      access.attendance
        ? getJson<AttendanceDashboard>("/api/v1/attendance/dashboard", signal)
        : Promise.resolve(null),
    ]);

  const currentAcademicYear =
    academicYears.data.find((year) => year.active) ?? null;

  let fees: FeeDashboard | null = null;
  let lowAttendance: LowAttendanceRow[] = [];
  let outstanding: OutstandingRow[] = [];
  let houseSummaries: HouseSummary[] = [];
  let birthdaySummaries: BirthdaySummary[] = [];

  if (currentAcademicYear) {
    const academicYearId = encodeURIComponent(currentAcademicYear.id);

    const [
      feeDashboard,
      lowAttendanceReport,
      outstandingReport,
      houseData,
      birthdayData,
    ] = await Promise.all([
      access.fees
        ? getJson<FeeDashboard>(
            `/api/v1/fees/dashboard?academicYearId=${academicYearId}`,
            signal,
          )
        : Promise.resolve(null),

      access.attendance
        ? getJson<{
            rows: LowAttendanceRow[];
          }>(
            `/api/v1/attendance/reports/low?academicYearId=${academicYearId}&threshold=75`,
            signal,
          )
        : Promise.resolve(null),

      access.fees
        ? getJson<{
            rows: OutstandingRow[];
          }>(
            `/api/v1/fees/outstanding?academicYearId=${academicYearId}`,
            signal,
          )
        : Promise.resolve(null),

      getJson<{ houses: HouseSummary[] }>(
        `/api/v1/houses?academicYearId=${academicYearId}`,
        signal,
      ),
      getJson<{ birthdays: BirthdaySummary[] }>("/api/v1/birthdays", signal),
    ]);

    fees = feeDashboard;
    lowAttendance = lowAttendanceReport?.rows ?? [];
    outstanding = outstandingReport?.rows ?? [];
    houseSummaries = houseData?.houses ?? [];
    birthdaySummaries = birthdayData?.birthdays ?? [];
  }

  return {
    academicYear: currentAcademicYear,
    students: students.total,
    teachers: teachers?.total ?? 0,
    classes: classes.total,
    attendance: attendance ?? null,
    fees,
    lowAttendance,
    outstanding,
    houses: houseSummaries,
    birthdays: birthdaySummaries,
  };
}

/* ==========================================================================
   FORMATTERS
   ========================================================================== */

function formatCurrency(value: number | string | undefined) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* ==========================================================================
   DASHBOARD
   ========================================================================== */

export default function DashboardPage() {
  const { school, role } = useSchool();
  const canReadAttendance = hasPermission(role, PERMISSIONS.ATTENDANCE_READ);
  const canReadFees = hasPermission(role, PERMISSIONS.FEE_READ);
  const canReadStaff = hasPermission(role, PERMISSIONS.STAFF_READ);
  const isAdministrator = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(role);

  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------
     INITIAL LOAD
     ------------------------------------------------------------------------ */

  useEffect(() => {
    const controller = new AbortController();

    const loadInitialDashboard = async () => {
      try {
        setError(null);

        const dashboardData = await fetchDashboardData(controller.signal, {
          attendance: canReadAttendance,
          fees: canReadFees,
          staff: canReadStaff,
        });

        if (controller.signal.aborted) {
          return;
        }

        setData(dashboardData);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dashboard data.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadInitialDashboard();

    return () => {
      controller.abort();
    };
  }, [canReadAttendance, canReadFees, canReadStaff]);

  /* ------------------------------------------------------------------------
     REFRESH
     ------------------------------------------------------------------------ */

  const loadDashboard = useCallback(async () => {
    const controller = new AbortController();

    setRefreshing(true);
    setError(null);

    try {
      const dashboardData = await fetchDashboardData(controller.signal, {
        attendance: canReadAttendance,
        fees: canReadFees,
        staff: canReadStaff,
      });

      if (!controller.signal.aborted) {
        setData(dashboardData);
      }
    } catch (loadError) {
      if (
        loadError instanceof DOMException &&
        loadError.name === "AbortError"
      ) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to refresh dashboard data.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [canReadAttendance, canReadFees, canReadStaff]);

  const attendance = data.attendance;
  const fees = data.fees;

  /* ==========================================================================
     ACTION CENTER
     ========================================================================== */

  const actionItems = useMemo(() => {
    const items: Array<{
      title: string;
      description: string;
      href: string;
      tone: "warning" | "danger" | "info" | "success";
    }> = [];

    const academicYearId = data.academicYear?.id;

    const lowAttendance = data.lowAttendance ?? [];
    const outstanding = data.outstanding ?? [];

    /* LOW ATTENDANCE */

    if (lowAttendance.length > 0 && academicYearId) {
      const first = lowAttendance[0];

      items.push({
        title: `${lowAttendance.length} students below 75% attendance`,

        description: first
          ? `${first.fullName} is at ${first.attendancePercentage}%. Open the low-attendance report to review all students.`
          : "Review students who need attendance intervention.",

        href:
          `/${school.slug}` +
          `/attendance/reports/low` +
          `?academicYearId=${encodeURIComponent(academicYearId)}` +
          `&threshold=75`,

        tone: "warning",
      });
    }

    /* OUTSTANDING FEES */

    if (outstanding.length > 0 && academicYearId) {
      const totalOutstanding = outstanding.reduce(
        (sum, row) => sum + Number(row.outstanding || 0),
        0,
      );

      const first = outstanding[0];

      items.push({
        title: `${outstanding.length} fee installments need attention`,

        description: first
          ? `${first.student.fullName} has ${formatCurrency(
              first.outstanding,
            )} outstanding. Total visible outstanding: ${formatCurrency(
              totalOutstanding,
            )}.`
          : `${formatCurrency(totalOutstanding)} is currently outstanding.`,

        href:
          `/${school.slug}` +
          `/fees/outstanding` +
          `?academicYearId=${encodeURIComponent(academicYearId)}`,

        tone: "danger",
      });
    }

    /* INCOMPLETE ATTENDANCE */

    const incompleteAttendanceSessions =
      attendance?.recentSessions.filter((session) => !session.completed) ?? [];

    if (incompleteAttendanceSessions.length > 0) {
      const first = incompleteAttendanceSessions[0];

      items.push({
        title: `${incompleteAttendanceSessions.length} attendance sessions need marking`,

        description: `${first.className} - ${first.sectionName} has an incomplete attendance session.`,

        href: `/${school.slug}/attendance`,

        tone: "info",
      });
    }

    /* PARTIAL PAYMENTS */

    if ((fees?.summary.partialCount ?? 0) > 0) {
      items.push({
        title: `${fees?.summary.partialCount ?? 0} installments are partially paid`,

        description:
          "Review partial payments and follow up on remaining balances.",

        href: `/${school.slug}/fees/outstanding`,

        tone: "warning",
      });
    }

    /* EVERYTHING OK */

    if (items.length === 0) {
      items.push({
        title: "School operations are on track",

        description: canReadFees
          ? "No critical attendance or fee alerts were detected."
          : "No critical attendance alerts were detected.",

        href: `/${school.slug}/dashboard`,

        tone: "success",
      });
    }

    return items.slice(0, 4);
  }, [
    attendance,
    canReadFees,
    data.academicYear?.id,
    data.lowAttendance,
    data.outstanding,
    fees,
    school.slug,
  ]);

  /* ==========================================================================
     QUICK ACTIONS
     ========================================================================== */

  const quickActions = [
    {
      label: "Add Student",
      href: `/${school.slug}/students`,
      icon: GraduationCap,
      visible: ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"].includes(role),
    },
    {
      label: "Mark Attendance",
      href: `/${school.slug}/attendance`,
      icon: CalendarCheck,
      visible: canReadAttendance,
    },
    {
      label: "Fee Dashboard",
      href: `/${school.slug}/fees/dashboard`,
      icon: WalletCards,
      visible: canReadFees,
    },
    {
      label: "Reports",
      href: `/${school.slug}` + `/attendance/reports/student`,
      icon: Clock3,
      visible: canReadAttendance,
    },
  ].filter((action) => action.visible);

  /* ==========================================================================
     RENDER
     ========================================================================== */

  const incompleteSessions =
    attendance?.recentSessions.filter((session) => !session.completed).length ??
    0;
  const totalOutstanding = (data.outstanding ?? []).reduce(
    (sum, row) => sum + Number(row.outstanding || 0),
    0,
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="School Command Center"
        description={`${school.name ?? "School"} · ${data.academicYear?.name ?? "No active academic year"}`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={loading || refreshing}
            className="bg-white shadow-sm"
          >
            <RefreshCw
              className={refreshing ? "size-4 animate-spin" : "size-4"}
            />
            Refresh
          </Button>
        }
      />

      {error && (
        <Card className="rounded-2xl border-red-200 bg-red-50/70 shadow-none">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-red-100">
                <CircleAlert className="size-4 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  Dashboard data could not be loaded
                </p>
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadDashboard()}
              disabled={refreshing}
              className="bg-white"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 md:px-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">
                  Today at school
                </p>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Your school, at a glance
              </h2>
            </div>
            <p className="text-sm text-slate-400">Live operational snapshot</p>
          </div>
        </div>

        <div
          className={`grid divide-y divide-slate-100 md:divide-x md:divide-y-0 ${canReadFees ? "md:grid-cols-3" : "md:grid-cols-2"}`}
        >
          <CommandMetric
            icon={GraduationCap}
            label="Students"
            value={loading ? "—" : data.students.toLocaleString("en-IN")}
            detail={
              canReadStaff
                ? `${data.teachers.toLocaleString("en-IN")} teachers · ${data.classes} classes`
                : `${data.classes} classes`
            }
          />
          {canReadAttendance && (
            <CommandMetric
              icon={CalendarCheck}
              label="Attendance today"
              value={
                loading
                  ? "—"
                  : `${attendance?.summary.attendancePercentage ?? 0}%`
              }
              detail={`${attendance?.summary.present ?? 0} present · ${attendance?.summary.absent ?? 0} absent`}
            />
          )}
          {canReadFees && (
            <CommandMetric
              icon={IndianRupee}
              label="Collection this month"
              value={fees ? formatCurrency(fees.collection.thisMonth) : "—"}
              detail={
                fees
                  ? `${fees.collection.thisMonthPaymentCount} payments · ${formatCurrency(fees.summary.outstanding)} due`
                  : "Collection data"
              }
            />
          )}
        </div>
      </section>

      <section
        className={`grid gap-6 ${canReadAttendance ? "xl:grid-cols-[1.35fr_0.85fr]" : ""}`}
      >
        {canReadAttendance && (
          <Card className="overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-indigo-600 uppercase">
                    Attendance today
                  </p>
                  <CardTitle className="mt-1.5 text-xl text-slate-950">
                    Daily attendance position
                  </CardTitle>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/${school.slug}/attendance`}>
                    Open attendance <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="text-4xl font-black tracking-tight text-slate-950">
                    {loading
                      ? "—"
                      : `${attendance?.summary.attendancePercentage ?? 0}%`}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    overall attendance
                  </p>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{
                        width: `${Math.min(100, attendance?.summary.attendancePercentage ?? 0)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <AttendanceCount
                    label="Present"
                    value={attendance?.summary.present ?? 0}
                  />
                  <AttendanceCount
                    label="Absent"
                    value={attendance?.summary.absent ?? 0}
                  />
                  <AttendanceCount
                    label="Late"
                    value={attendance?.summary.late ?? 0}
                  />
                  <AttendanceCount
                    label="Leave"
                    value={attendance?.summary.leave ?? 0}
                  />
                </div>
              </div>
              {attendance?.recentSessions.length ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Recent sessions
                    </p>
                    <p className="text-xs text-slate-400">
                      {incompleteSessions} incomplete
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {attendance.recentSessions.slice(0, 4).map((session) => {
                      const percentage =
                        session.totalStudents > 0
                          ? Math.round(
                              (session.present / session.totalStudents) * 100,
                            )
                          : 0;
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {session.className} - {session.sectionName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {formatDate(session.attendanceDate)} ·{" "}
                              {titleCase(session.sessionType)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${session.completed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                          >
                            {session.completed
                              ? `${percentage}%`
                              : "Incomplete"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState text="No attendance sessions are available yet." />
              )}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 px-6 py-5">
            <p className="text-[11px] font-bold tracking-[0.16em] text-amber-600 uppercase">
              Needs attention
            </p>
            <CardTitle className="mt-1.5 text-xl text-slate-950">
              Action center
            </CardTitle>
            <p className="text-sm text-slate-500">
              Items that need action today.
            </p>
          </CardHeader>
          <CardContent className="p-3">
            {actionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3 rounded-2xl p-3.5 transition-colors hover:bg-slate-50"
              >
                <div
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    item.tone === "danger"
                      ? "bg-red-50 text-red-600"
                      : item.tone === "warning"
                        ? "bg-amber-50 text-amber-600"
                        : item.tone === "success"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {item.tone === "success" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <CircleAlert className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-2 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-indigo-600 uppercase">
              Today&apos;s operations
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Move directly into the work
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-white"
                >
                  <Link href={action.href}>
                    <Icon className="size-4" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
        <div
          className={`grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 ${canReadFees ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
        >
          <OperationMetric
            label="Attendance sessions"
            value={
              attendance ? attendance.recentSessions.length.toString() : "—"
            }
            hint={`${incompleteSessions} need marking`}
          />
          <OperationMetric
            label="Low attendance"
            value={data.lowAttendance.length.toLocaleString("en-IN")}
            hint="Below 75%"
          />
          {canReadFees && (
            <OperationMetric
              label="Outstanding items"
              value={data.outstanding.length.toLocaleString("en-IN")}
              hint={formatCurrency(totalOutstanding)}
            />
          )}
          <OperationMetric
            label="Classes"
            value={data.classes.toLocaleString("en-IN")}
            hint="Active structure"
          />
        </div>
      </section>

      {canReadFees && (
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="rounded-3xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="px-6 py-5">
              <p className="text-[11px] font-bold tracking-[0.16em] text-indigo-600 uppercase">
                Fee position
              </p>
              <CardTitle className="mt-1.5 text-xl text-slate-950">
                Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <Metric
                label="Collected today"
                value={fees ? formatCurrency(fees.collection.today) : "—"}
                hint={
                  fees ? `${fees.collection.todayPaymentCount} payments` : "—"
                }
              />
              <Metric
                label="Collected this month"
                value={fees ? formatCurrency(fees.collection.thisMonth) : "—"}
                hint={
                  fees
                    ? `${fees.collection.thisMonthPaymentCount} payments`
                    : "—"
                }
              />
              <Metric
                label="Outstanding"
                value={fees ? formatCurrency(fees.summary.outstanding) : "—"}
                hint={
                  fees
                    ? `${fees.summary.pendingCount} pending installments`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-6 py-5">
              <div>
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                  Recent activity
                </p>
                <CardTitle className="mt-1.5 text-xl text-slate-950">
                  Latest fee receipts
                </CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/${school.slug}/fees/dashboard`}>
                  Fee dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {fees?.recentPayments?.length ? (
                <div className="divide-y divide-slate-100">
                  {fees.recentPayments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center gap-4 py-3"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <IndianRupee className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {payment.studentEnrollment.student.fullName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {payment.studentEnrollment.class.name} -{" "}
                          {payment.studentEnrollment.section.name} ·{" "}
                          {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No recent fee payments are available." />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {isAdministrator &&
        (data.birthdays.length > 0 || data.houses.length > 0) && (
          <section className="grid gap-6 lg:grid-cols-2">
            {data.birthdays.length > 0 && (
              <Card className="rounded-3xl border-slate-200/80 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between px-6 py-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-violet-600 uppercase">
                      Today
                    </p>
                    <CardTitle className="mt-1 text-lg">Birthdays</CardTitle>
                  </div>
                  <Cake className="size-5 text-violet-500" />
                </CardHeader>
                <CardContent className="space-y-2 px-6 pb-6">
                  {data.birthdays.slice(0, 4).map((student) => (
                    <Link
                      key={student.id}
                      href={`/${school.slug}/students/${student.id}`}
                      className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50"
                    >
                      <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-600">
                        {student.fullName?.charAt(0) || "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {student.fullName || "Unnamed Student"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {student.admissionNo}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
            {data.houses.length > 0 && (
              <Card className="rounded-3xl border-slate-200/80 bg-white shadow-sm">
                <CardHeader className="px-6 py-5">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-indigo-600 uppercase">
                    Student houses
                  </p>
                  <CardTitle className="mt-1 text-lg">House strength</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 px-6 pb-6">
                  {data.houses.slice(0, 4).map((house) => (
                    <Link
                      key={house.id}
                      href={`/${school.slug}/student-houses?houseId=${encodeURIComponent(house.id)}`}
                      className="rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-700">
                        {house.name}
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {house._count.students.toLocaleString("en-IN")}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        )}
    </div>
  );
}

function CommandMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof GraduationCap;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-6 md:px-7">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function AttendanceCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function OperationMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

/* ==========================================================================
   METRIC
   ========================================================================== */

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition-colors hover:border-indigo-100 hover:bg-indigo-50/30">
      <p className="text-xs font-medium text-slate-400">{label}</p>

      <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
        <Clock3 className="size-5" />
      </div>

      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </div>
  );
}
