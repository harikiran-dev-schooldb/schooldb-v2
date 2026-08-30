"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  GraduationCap,
  IndianRupee,
  RefreshCw,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/school-context";

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

type DashboardData = {
  academicYear: AcademicYear | null;
  students: number;
  teachers: number;
  classes: number;
  attendance: AttendanceDashboard | null;
  fees: FeeDashboard | null;
  lowAttendance: LowAttendanceRow[];
  outstanding: OutstandingRow[];
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

async function fetchDashboardData(signal: AbortSignal): Promise<DashboardData> {
  const [academicYears, students, teachers, classes, attendance] =
    await Promise.all([
      getJson<{
        data: AcademicYear[];
        total: number;
      }>("/api/v1/academic-years?page=1&pageSize=100", signal),

      getJson<PaginatedResult>("/api/v1/students?page=1&pageSize=1", signal),

      getJson<PaginatedResult>("/api/v1/teachers?page=1&pageSize=1", signal),

      getJson<PaginatedResult>("/api/v1/classes?page=1&pageSize=1", signal),

      getJson<AttendanceDashboard>("/api/v1/attendance/dashboard", signal),
    ]);

  const currentAcademicYear =
    academicYears.data.find((year) => year.active) ?? null;

  let fees: FeeDashboard | null = null;
  let lowAttendance: LowAttendanceRow[] = [];
  let outstanding: OutstandingRow[] = [];

  if (currentAcademicYear) {
    const academicYearId = encodeURIComponent(currentAcademicYear.id);

    const [feeDashboard, lowAttendanceReport, outstandingReport] =
      await Promise.all([
        getJson<FeeDashboard>(
          `/api/v1/fees/dashboard?academicYearId=${academicYearId}`,
          signal,
        ),

        getJson<{
          rows: LowAttendanceRow[];
        }>(
          `/api/v1/attendance/reports/low?academicYearId=${academicYearId}&threshold=75`,
          signal,
        ),

        getJson<{
          rows: OutstandingRow[];
        }>(`/api/v1/fees/outstanding?academicYearId=${academicYearId}`, signal),
      ]);

    fees = feeDashboard;
    lowAttendance = lowAttendanceReport.rows ?? [];
    outstanding = outstandingReport.rows ?? [];
  }

  return {
    academicYear: currentAcademicYear,
    students: students.total,
    teachers: teachers.total,
    classes: classes.total,
    attendance: attendance ?? null,
    fees,
    lowAttendance,
    outstanding,
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
  const { school } = useSchool();

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

        const dashboardData = await fetchDashboardData(controller.signal);

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
  }, []);

  /* ------------------------------------------------------------------------
     REFRESH
     ------------------------------------------------------------------------ */

  const loadDashboard = useCallback(async () => {
    const controller = new AbortController();

    setRefreshing(true);
    setError(null);

    try {
      const dashboardData = await fetchDashboardData(controller.signal);

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
  }, []);

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

        description: "No critical attendance or fee alerts were detected.",

        href: `/${school.slug}/dashboard`,

        tone: "success",
      });
    }

    return items.slice(0, 4);
  }, [
    attendance,
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
    },
    {
      label: "Mark Attendance",
      href: `/${school.slug}/attendance`,
      icon: CalendarCheck,
    },
    {
      label: "Fee Dashboard",
      href: `/${school.slug}/fees/dashboard`,
      icon: WalletCards,
    },
    {
      label: "Reports",
      href: `/${school.slug}` + `/attendance/reports/student`,
      icon: Clock3,
    },
  ];

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="space-y-7 pb-12">
      {/* ======================================================================
          PAGE HEADER
          ====================================================================== */}

      <PageHeader
        title="Dashboard"
        description="A live operational view of your school."
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

      {/* ======================================================================
          ERROR
          ====================================================================== */}

      {error && (
        <Card className="rounded-2xl border-red-200 bg-red-50/70 shadow-none">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
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

      {/* ======================================================================
          PREMIUM LIGHT HERO
          ====================================================================== */}

      <section className="premium-hero relative overflow-hidden px-6 py-6 md:px-8 md:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 right-1/3 size-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT */}

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur">
              <Sparkles className="size-3 text-indigo-500" />

              <span className="text-[10px] font-bold tracking-[0.18em] text-indigo-600 uppercase">
                {data.academicYear?.name ?? "No active academic year"}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-slate-950 md:text-4xl md:leading-[1.08]">
              Run your school
              <br className="hidden md:block" />{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
                from one clear view.
              </span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Live attendance, student, teacher and fee metrics for the current
              academic year.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
              {/* Attendance */}

              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                  <CalendarCheck className="size-4 text-indigo-600" />
                </div>

                <div>
                  <p className="text-base font-bold leading-none text-slate-900">
                    {loading
                      ? "—"
                      : `${attendance?.summary.attendancePercentage ?? 0}%`}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    Attendance today
                  </p>
                </div>
              </div>

              <div className="hidden h-8 w-px bg-slate-200 sm:block" />

              {/* Students */}

              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                  <GraduationCap className="size-4 text-blue-600" />
                </div>

                <div>
                  <p className="text-base font-bold leading-none text-slate-900">
                    {loading ? "—" : data.students.toLocaleString("en-IN")}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    Students
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLLECTION */}

          <div className="min-w-[230px] rounded-2xl border border-indigo-100 bg-white/85 p-4 shadow-[0_15px_35px_rgba(79,70,229,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 ring-1 ring-indigo-100">
                <WalletCards className="size-5 text-indigo-600" />
              </div>

              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                  This month
                </p>

                <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  {fees ? formatCurrency(fees.collection.thisMonth) : "—"}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  {fees
                    ? `${fees.collection.thisMonthPaymentCount} payments received`
                    : "Collection data"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          KPI
          ====================================================================== */}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={loading ? "—" : data.students.toLocaleString("en-IN")}
          icon={GraduationCap}
          description="Active school records"
          className="premium-card rounded-2xl border-0 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Teachers"
          value={loading ? "—" : data.teachers.toLocaleString("en-IN")}
          icon={Users}
          description="Teaching staff"
          className="premium-card rounded-2xl border-0 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Attendance"
          value={
            loading ? "—" : `${attendance?.summary.attendancePercentage ?? 0}%`
          }
          icon={CalendarCheck}
          description={`${attendance?.summary.present ?? 0} present today`}
          className="premium-card rounded-2xl border-0 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Fee Collection"
          value={fees ? formatCurrency(fees.collection.thisMonth) : "—"}
          icon={IndianRupee}
          description={
            fees
              ? `${fees.collection.thisMonthPaymentCount} payments this month`
              : "Current academic year"
          }
          className="premium-card rounded-2xl border-0 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />
      </section>

      {/* ======================================================================
          ATTENDANCE + ACTION CENTER
          ====================================================================== */}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        {/* ATTENDANCE */}

        <Card className="premium-card overflow-hidden rounded-2xl border-0 bg-white">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-500 uppercase">
              Attendance Overview
            </p>

            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
              Recent sessions
            </CardTitle>

            <p className="mt-1 text-sm text-slate-500">
              Latest attendance activity from the active academic year.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {attendance?.recentSessions.length ? (
              <div className="space-y-5">
                {attendance.recentSessions.slice(0, 6).map((session) => {
                  const percentage =
                    session.totalStudents > 0
                      ? Math.round(
                          (session.present / session.totalStudents) * 100,
                        )
                      : 0;

                  return (
                    <div key={session.id} className="space-y-2.5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {session.className} - {session.sectionName}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatDate(session.attendanceDate)} ·{" "}
                            {titleCase(session.sessionType)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                          {percentage}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 transition-all"
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="No attendance sessions are available yet." />
            )}
          </CardContent>
        </Card>

        {/* ACTION CENTER */}

        <Card className="premium-card overflow-hidden rounded-2xl border-0 bg-white">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-500 uppercase">
              Action Center
            </p>

            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
              Needs your attention
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-1 p-4">
            {actionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-2xl border border-transparent p-3.5 transition-all hover:border-slate-200 hover:bg-slate-50/80 hover:shadow-sm"
              >
                <div
                  className={[
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",

                    item.tone === "success" && "bg-emerald-50 text-emerald-600",

                    item.tone === "info" && "bg-blue-50 text-blue-600",

                    item.tone === "warning" && "bg-amber-50 text-amber-600",

                    item.tone === "danger" && "bg-red-50 text-red-600",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>

                <ArrowRight className="mt-1 size-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ======================================================================
          QUICK ACTIONS + FEE OPERATIONS
          ====================================================================== */}

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* QUICK ACTIONS */}

        <Card className="premium-card rounded-2xl border-0 bg-white">
          <CardHeader className="px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-500 uppercase">
              Quick Actions
            </p>

            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
              Get things done
            </CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-3 p-6 pt-0">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                    <Icon className="size-4" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    {action.label}
                  </p>

                  <ArrowRight className="mt-3 size-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* FEE OPERATIONS */}

        <Card className="premium-card rounded-2xl border-0 bg-white">
          <CardHeader className="flex flex-row items-start justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-500 uppercase">
                Fee Operations
              </p>

              <CardTitle className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
                Collection snapshot
              </CardTitle>
            </div>

            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 p-6 pt-0 sm:grid-cols-3">
            <Metric
              label="Today"
              value={fees ? formatCurrency(fees.collection.today) : "—"}
              hint={
                fees ? `${fees.collection.todayPaymentCount} payments` : "—"
              }
            />

            <Metric
              label="Outstanding"
              value={fees ? formatCurrency(fees.summary.outstanding) : "—"}
              hint={fees ? `${fees.summary.pendingCount} pending` : "—"}
            />

            <Metric
              label="Paid Installments"
              value={
                fees ? fees.summary.paidCount.toLocaleString("en-IN") : "—"
              }
              hint={fees ? `${fees.summary.installmentCount} total` : "—"}
            />
          </CardContent>
        </Card>
      </section>

      {/* ======================================================================
          REPORT LINK
          ====================================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/50 px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Need detailed reports?
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            Open the reporting area for filtered and exportable school data.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="bg-white">
          <Link href={`/${school.slug}/reports`}>
            View Reports
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
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
