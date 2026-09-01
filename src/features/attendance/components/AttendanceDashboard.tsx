"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  History,
  Loader2,
  Sparkles,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  schoolSlug: string;
};

type DashboardData = {
  summary: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    attendancePercentage: number;
  };

  recentSessions: {
    id: string;
    attendanceDate: string;
    sessionType: string;
    className: string;
    sectionName: string;
    totalStudents: number;
    present: number;
    absent: number;
    completed: boolean;
  }[];

  alerts: {
    lowAttendanceCount: number;
    threshold: number;
  };
};

export function AttendanceDashboard({ schoolSlug }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ==========================================================================
     LOAD DASHBOARD
     ========================================================================== */

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);

        const response = await fetch("/api/v1/attendance/dashboard", {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load attendance dashboard:", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      controller.abort();
    };
  }, []);

  /* ==========================================================================
     DEFAULT DATA
     ========================================================================== */

  const summary = data?.summary ?? {
    totalStudents: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    attendancePercentage: 0,
  };

  const recentSessions = data?.recentSessions ?? [];

  const alerts = data?.alerts ?? {
    lowAttendanceCount: 0,
    threshold: 75,
  };

  /* ==========================================================================
     QUICK ACTIONS
     ========================================================================== */

  const quickActions = [
    {
      title: "Mark Attendance",
      description: "Create and manage attendance sessions.",
      icon: CheckCircle2,
      href: `/${schoolSlug}/attendance`,
    },
    {
      title: "Attendance History",
      description: "Review previously recorded attendance.",
      icon: History,
      href: `/${schoolSlug}/attendance/history`,
    },
    {
      title: "Student Report",
      description: "View attendance for an individual student.",
      icon: GraduationCap,
      href: `/${schoolSlug}/attendance/reports/student`,
    },
    {
      title: "Class Report",
      description: "Analyse attendance by class and section.",
      icon: Users,
      href: `/${schoolSlug}/attendance/reports/class`,
    },
    {
      title: "Low Attendance",
      description: "Identify students requiring attention.",
      icon: AlertTriangle,
      href: `/${schoolSlug}/attendance/reports/low`,
    },
  ];

  /* ==========================================================================
     LOADING
     ========================================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin text-indigo-500" />
          Loading attendance dashboard...
        </div>
      </div>
    );
  }

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="w-full space-y-7 pb-10">
      {/* ======================================================================
          PAGE HEADER
          ====================================================================== */}

      <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <CalendarDays className="size-5" strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3 text-indigo-500" />

              <span className="text-[10px] font-bold tracking-[0.18em] text-indigo-600 uppercase">
                Attendance
              </span>
            </div>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Attendance Dashboard
            </h1>

            <p className="mt-0.5 text-sm text-slate-500">
              Monitor attendance activity and identify students requiring
              attention.
            </p>
          </div>
        </div>

        <Button
          asChild
          className="w-full gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
        >
          <Link href={`/${schoolSlug}/attendance`}>
            <CheckCircle2 className="size-4" />
            Mark Attendance
          </Link>
        </Button>
      </div>

      {/* ======================================================================
          SUMMARY
          ====================================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <CheckCircle2 className="size-4" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Attendance Overview
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Current attendance statistics across the school.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <DashboardCard
            label="Total Students"
            value={summary.totalStudents}
            icon={<Users className="size-4" />}
          />

          <DashboardCard
            label="Present"
            value={summary.present}
            icon={<UserCheck className="size-4" />}
            iconClassName="bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
            valueClassName="text-emerald-600"
          />

          <DashboardCard
            label="Absent"
            value={summary.absent}
            icon={<UserX className="size-4" />}
            iconClassName="bg-red-50 text-red-600 ring-1 ring-red-100"
            valueClassName="text-red-600"
          />

          <DashboardCard
            label="Late"
            value={summary.late}
            icon={<Clock3 className="size-4" />}
            iconClassName="bg-amber-50 text-amber-600 ring-1 ring-amber-100"
            valueClassName="text-amber-600"
          />

          <DashboardCard
            label="Leave"
            value={summary.leave}
            icon={<FileText className="size-4" />}
            iconClassName="bg-blue-50 text-blue-600 ring-1 ring-blue-100"
            valueClassName="text-blue-600"
          />

          <DashboardCard
            label="Attendance"
            value={`${summary.attendancePercentage}%`}
            icon={<CheckCircle2 className="size-4" />}
            iconClassName="bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
            valueClassName="text-indigo-600"
          />
        </div>
      </section>

      {/* ======================================================================
          QUICK ACTIONS
          ====================================================================== */}

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-white to-indigo-50/30 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Sparkles className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Quick Actions
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Access attendance management and reporting tools.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/20 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                      <Icon className="size-5" />
                    </div>

                    <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    {action.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ======================================================================
          RECENT SESSIONS + ALERT
          ====================================================================== */}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* ====================================================================
            RECENT SESSIONS
            ==================================================================== */}

        <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200/70 bg-gradient-to-r from-white to-indigo-50/30 px-5 py-4 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <History className="size-4" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Recent Attendance Sessions
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Latest recorded attendance activity.
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-fit gap-1 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Link href={`/${schoolSlug}/attendance/history`}>
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {recentSessions.length === 0 ? (
              <EmptyState
                icon={<History className="size-7 text-slate-400" />}
                title="No attendance sessions yet"
                description="Attendance sessions will appear here after they are created."
                action={
                  <Button
                    asChild
                    className="mt-5 gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Link href={`/${schoolSlug}/attendance`}>
                      <CheckCircle2 className="size-4" />
                      Mark Attendance
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-200">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/${schoolSlug}/attendance/session/${session.id}`}
                    className="group flex flex-col gap-4 p-5 transition-colors hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                        <CalendarDays className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {session.className} - {session.sectionName}
                          </p>

                          <SessionTypeBadge type={session.sessionType} />
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            {new Date(
                              session.attendanceDate,
                            ).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>

                          <span>{session.totalStudents} Students</span>

                          <span className="text-emerald-600">
                            {session.present} Present
                          </span>

                          <span className="text-red-600">
                            {session.absent} Absent
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:shrink-0">
                      <span
                        className={
                          session.completed
                            ? "rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-700 uppercase ring-1 ring-emerald-100"
                            : "rounded-md bg-amber-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-700 uppercase ring-1 ring-amber-100"
                        }
                      >
                        {session.completed ? "Completed" : "Pending"}
                      </span>

                      <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ====================================================================
            ATTENDANCE ALERT
            ==================================================================== */}

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="size-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Attendance Alert
                </h2>

                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Students requiring attendance monitoring.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-red-100 bg-red-50/40 p-5">
              <p className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase">
                Below {alerts.threshold}% Attendance
              </p>

              <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
                {alerts.lowAttendanceCount}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                students require attention based on the current attendance
                threshold.
              </p>
            </div>

            <Button
              variant="outline"
              className="mt-5 h-10 w-full gap-2 rounded-xl border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
              asChild
            >
              <Link href={`/${schoolSlug}/attendance/reports/low`}>
                View Low Attendance
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================================
          FOOTNOTE
          ====================================================================== */}

      <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-center text-xs text-slate-400">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />

        <span>Attendance monitoring is based on the active academic year.</span>
      </div>
    </div>
  );
}

/* ==========================================================================
   DASHBOARD CARD
   ========================================================================== */

function DashboardCard({
  label,
  value,
  icon,
  iconClassName = "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconClassName?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_10px_35px_rgba(15,23,42,0.07)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">{label}</span>

          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
          >
            {icon}
          </div>
        </div>

        <p
          className={`mt-4 text-2xl font-bold tracking-tight ${valueClassName}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
   SESSION TYPE BADGE
   ========================================================================== */

function SessionTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    DAILY: "Daily",
    MORNING: "Morning",
    AFTERNOON: "Afternoon",
    PERIOD: "Period",
  };

  return (
    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
      {labels[type] ?? type}
    </span>
  );
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 shadow-sm ring-1 ring-slate-200">
        {icon}
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">{title}</p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>

      {action}
    </div>
  );
}
