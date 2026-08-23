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
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

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

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);

        const response = await fetch("/api/v1/attendance/dashboard");

        const result = await response.json();

        if (!cancelled && result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to load attendance dashboard:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const quickActions = [
    {
      title: "Mark Attendance",
      description: "Create and manage attendance sessions",
      icon: CheckCircle2,
      href: `/${schoolSlug}/attendance`,
    },
    {
      title: "Attendance History",
      description: "View previous attendance sessions",
      icon: History,
      href: `/${schoolSlug}/attendance/history`,
    },
    {
      title: "Student Report",
      description: "View individual student attendance",
      icon: GraduationCap,
      href: `/${schoolSlug}/attendance/reports/student`,
    },
    {
      title: "Class Report",
      description: "Analyse attendance by class",
      icon: Users,
      href: `/${schoolSlug}/attendance/reports/class`,
    },
    {
      title: "Low Attendance",
      description: "Identify students needing attention",
      icon: AlertTriangle,
      href: `/${schoolSlug}/attendance/reports/low`,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading attendance dashboard...
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>

            <span className="text-sm font-medium text-primary">
              Attendance Overview
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Attendance Dashboard
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Monitor attendance activity and identify students requiring
            attention.
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link href={`/${schoolSlug}/attendance`}>
            <CheckCircle2 className="h-4 w-4" />
            Mark Attendance
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <DashboardCard
          label="Total Students"
          value={summary.totalStudents}
          icon={<Users className="h-5 w-5" />}
        />

        <DashboardCard
          label="Present"
          value={summary.present}
          icon={<UserCheck className="h-5 w-5" />}
          iconClassName="bg-green-500/10 text-green-600"
          valueClassName="text-green-600"
        />

        <DashboardCard
          label="Absent"
          value={summary.absent}
          icon={<UserX className="h-5 w-5" />}
          iconClassName="bg-red-500/10 text-red-600"
          valueClassName="text-red-600"
        />

        <DashboardCard
          label="Late"
          value={summary.late}
          icon={<Clock3 className="h-5 w-5" />}
          iconClassName="bg-amber-500/10 text-amber-600"
          valueClassName="text-amber-600"
        />

        <DashboardCard
          label="Leave"
          value={summary.leave}
          icon={<FileText className="h-5 w-5" />}
          iconClassName="bg-blue-500/10 text-blue-600"
          valueClassName="text-blue-600"
        />

        <DashboardCard
          label="Attendance"
          value={`${summary.attendancePercentage}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="bg-primary/10 text-primary"
          valueClassName="text-primary"
        />
      </div>

      {/* Quick Actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>

          <p className="text-sm text-muted-foreground">
            Access attendance management and reports.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                <h3 className="mt-5 font-semibold">{action.title}</h3>

                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Recent Sessions */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Recent Attendance Sessions</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Latest recorded attendance activity.
              </p>
            </div>

            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/${schoolSlug}/attendance/history`}
                className="gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {recentSessions.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-muted p-4">
                <History className="h-7 w-7 text-muted-foreground" />
              </div>

              <p className="mt-4 font-medium">No attendance sessions yet</p>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Attendance sessions will appear here after they are created.
              </p>

              <Button className="mt-5" asChild>
                <Link href={`/${schoolSlug}/attendance`}>Mark Attendance</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/${schoolSlug}/attendance/session/${session.id}`}
                  className="group flex flex-col gap-4 p-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="rounded-xl bg-muted p-3">
                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {session.className} - {session.sectionName}
                        </p>

                        <SessionTypeBadge type={session.sessionType} />
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>
                          {new Date(
                            session.attendanceDate,
                          ).toLocaleDateString()}
                        </span>

                        <span>{session.totalStudents} Students</span>

                        <span>{session.present} Present</span>

                        <span>{session.absent} Absent</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={
                        session.completed
                          ? "rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600"
                          : "rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600"
                      }
                    >
                      {session.completed ? "Completed" : "Pending"}
                    </span>

                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Attendance Alert */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <p className="font-semibold">Attendance Alert</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Students requiring attendance monitoring.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border bg-muted/30 p-5">
            <p className="text-sm text-muted-foreground">
              Below {alerts.threshold}% attendance
            </p>

            <p className="mt-2 text-4xl font-bold">
              {alerts.lowAttendanceCount}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              students require attention based on the current attendance
              threshold.
            </p>
          </div>

          <Button variant="outline" className="mt-5 w-full gap-2" asChild>
            <Link href={`/${schoolSlug}/attendance/reports/low`}>
              View Low Attendance
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  icon,
  iconClassName = "bg-muted text-muted-foreground",
  valueClassName = "",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>

        <div className={`rounded-lg p-2 ${iconClassName}`}>{icon}</div>
      </div>

      <p className={`mt-5 text-3xl font-bold tracking-tight ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function SessionTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    DAILY: "Daily",
    MORNING: "Morning",
    AFTERNOON: "Afternoon",
    PERIOD: "Period",
  };

  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      {labels[type] ?? type}
    </span>
  );
}
