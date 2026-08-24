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

/**
 * Fetches all dashboard data.
 *
 * Important:
 * This function does NOT call setState.
 * It only fetches and returns data.
 */
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
    fees: fees ?? null,
    lowAttendance,
    outstanding,
  };
}

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

export default function DashboardPage() {
  const { school } = useSchool();

  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * INITIAL DASHBOARD LOAD
   *
   * The effect does not synchronously
   * call a function that sets state.
   *
   * Data is fetched asynchronously and
   * state is updated only after the
   * request resolves.
   */
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

  /*
   * MANUAL REFRESH
   */
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

  /*
   * ACTION CENTER
   */
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

    /*
     * LOW ATTENDANCE
     */
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

    /*
     * OUTSTANDING FEES
     */
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

    /*
     * INCOMPLETE ATTENDANCE
     */
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

    /*
     * PARTIAL PAYMENTS
     */
    if ((fees?.summary.partialCount ?? 0) > 0) {
      items.push({
        title: `${fees?.summary.partialCount ?? 0} installments are partially paid`,

        description:
          "Review partial payments and follow up on remaining balances.",

        href: `/${school.slug}/fees/outstanding`,

        tone: "warning",
      });
    }

    /*
     * EVERYTHING OK
     */
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

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Dashboard"
        description="A live operational view of your school."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={loading || refreshing}
          >
            <RefreshCw
              className={refreshing ? "size-4 animate-spin" : "size-4"}
            />
            Refresh
          </Button>
        }
      />

      {/* ERROR */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <CircleAlert className="size-5 text-destructive" />

              <div>
                <p className="font-semibold">
                  Dashboard data could not be loaded
                </p>

                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadDashboard()}
              disabled={refreshing}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* HERO */}
      <section className="premium-hero px-6 py-5 text-white md:px-8 md:py-6">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-teal-200 uppercase backdrop-blur-md">
              <Sparkles className="size-3" />

              {data.academicYear?.name ?? "No active academic year"}
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-white md:text-4xl md:leading-[1.08]">
              Run your school
              <br className="hidden md:block" />{" "}
              <span className="bg-gradient-to-r from-teal-200 via-cyan-200 to-blue-200 bg-clip-text text-transparent">
                from one clear view.
              </span>
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-5 text-white/65">
              Live attendance, student, teacher and fee metrics for the current
              academic year.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="size-4 text-teal-200" />

                <div>
                  <p className="text-base font-bold leading-none text-white">
                    {loading
                      ? "—"
                      : `${attendance?.summary.attendancePercentage ?? 0}%`}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-white/45">
                    Attendance today
                  </p>
                </div>
              </div>

              <div className="hidden h-7 w-px bg-white/10 sm:block" />

              <div className="flex items-center gap-2.5">
                <GraduationCap className="size-4 text-blue-200" />

                <div>
                  <p className="text-base font-bold leading-none text-white">
                    {loading ? "—" : data.students.toLocaleString("en-IN")}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-white/45">
                    Students
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-w-[200px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="flex size-10 items-center justify-center rounded-xl border border-teal-300/15 bg-gradient-to-br from-teal-300/20 to-cyan-400/5">
              <WalletCards className="size-4 text-teal-200" />
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight text-white">
                {fees ? formatCurrency(fees.collection.thisMonth) : "—"}
              </p>

              <p className="mt-1 text-[9px] font-bold tracking-[0.14em] text-white/45 uppercase">
                This month collection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={loading ? "—" : data.students.toLocaleString("en-IN")}
          icon={GraduationCap}
          description="Active school records"
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Teachers"
          value={loading ? "—" : data.teachers.toLocaleString("en-IN")}
          icon={Users}
          description="Teaching staff"
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Attendance"
          value={
            loading ? "—" : `${attendance?.summary.attendancePercentage ?? 0}%`
          }
          icon={CalendarCheck}
          description={`${attendance?.summary.present ?? 0} present today`}
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
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
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />
      </section>

      {/* ATTENDANCE + ACTION CENTER */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Attendance Overview
            </p>

            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight">
              Recent sessions
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Latest attendance activity from the active academic year.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {attendance?.recentSessions.length ? (
              <div className="space-y-4">
                {attendance.recentSessions.slice(0, 6).map((session) => {
                  const percentage =
                    session.totalStudents > 0
                      ? Math.round(
                          (session.present / session.totalStudents) * 100,
                        )
                      : 0;

                  return (
                    <div key={session.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {session.className} - {session.sectionName}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.attendanceDate)} ·{" "}
                            {titleCase(session.sessionType)}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-bold">
                          {percentage}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-teal-400 transition-all"
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
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Action Center
            </p>

            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight">
              Needs your attention
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 p-4">
            {actionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-2xl border border-transparent p-3.5 transition-all hover:border-border/70 hover:bg-background/70 hover:shadow-sm"
              >
                <div
                  className={[
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",

                    item.tone === "success" &&
                      "bg-emerald-500/10 text-emerald-600",

                    item.tone === "info" && "bg-blue-500/10 text-blue-600",

                    item.tone === "warning" && "bg-amber-500/10 text-amber-600",

                    item.tone === "danger" && "bg-red-500/10 text-red-600",
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
                  <p className="text-sm font-semibold">{item.title}</p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* QUICK ACTIONS + FEES */}
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="premium-card rounded-2xl border-0">
          <CardHeader className="px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Quick Actions
            </p>

            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight">
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
                  className="group rounded-2xl border border-border/60 bg-background/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <Icon className="size-5 text-primary" />

                  <p className="mt-3 text-sm font-semibold">{action.label}</p>

                  <ArrowRight className="mt-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="premium-card rounded-2xl border-0">
          <CardHeader className="flex flex-row items-start justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                Fee Operations
              </p>

              <CardTitle className="mt-1.5 text-xl font-bold tracking-tight">
                Collection snapshot
              </CardTitle>
            </div>

            <CreditCard className="size-5 text-primary" />
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

      {/* REPORT LINK */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Need detailed reports?</p>

          <p className="text-xs text-muted-foreground">
            Open the reporting area for filtered and exportable school data.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={`/${school.slug}/reports`}>
            View Reports
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>

      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
      <Clock3 className="size-5 text-muted-foreground" />

      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
