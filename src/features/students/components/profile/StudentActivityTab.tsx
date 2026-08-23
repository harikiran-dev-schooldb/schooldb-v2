"use client";

import { useEffect, useState } from "react";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileEdit,
  FileUp,
  GraduationCap,
  Loader2,
  UserPlus,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

type ActivityType =
  | "STUDENT_CREATED"
  | "PROFILE_UPDATED"
  | "ENROLLMENT_CREATED"
  | "ENROLLMENT_CHANGED"
  | "ATTENDANCE_MARKED"
  | "FEE_PAYMENT"
  | "FEE_CONCESSION"
  | "STATUS_CHANGED"
  | "PARENT_UPDATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED";

type StudentActivity = {
  id: string;

  type: ActivityType;

  title: string;

  description: string | null;

  performedByUserId: string | null;

  metadata: unknown;

  createdAt: string;
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getActivityConfig(type: ActivityType) {
  switch (type) {
    case "STUDENT_CREATED":
      return {
        label: "Student Created",
        icon: UserPlus,
        className: "bg-emerald-50 text-emerald-600",
        badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };

    case "PROFILE_UPDATED":
      return {
        label: "Profile Updated",
        icon: FileEdit,
        className: "bg-blue-50 text-blue-600",
        badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
      };

    case "ENROLLMENT_CREATED":
      return {
        label: "Enrollment",
        icon: GraduationCap,
        className: "bg-indigo-50 text-indigo-600",
        badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
      };

    case "ENROLLMENT_CHANGED":
      return {
        label: "Enrollment Changed",
        icon: GraduationCap,
        className: "bg-indigo-50 text-indigo-600",
        badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
      };

    case "ATTENDANCE_MARKED":
      return {
        label: "Attendance",
        icon: CalendarDays,
        className: "bg-amber-50 text-amber-600",
        badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
      };

    case "FEE_PAYMENT":
      return {
        label: "Fee Payment",
        icon: CreditCard,
        className: "bg-teal-50 text-teal-600",
        badgeClassName: "border-teal-200 bg-teal-50 text-teal-700",
      };

    case "FEE_CONCESSION":
      return {
        label: "Fee Concession",
        icon: CreditCard,
        className: "bg-violet-50 text-violet-600",
        badgeClassName: "border-violet-200 bg-violet-50 text-violet-700",
      };

    case "STATUS_CHANGED":
      return {
        label: "Status Changed",
        icon: AlertCircle,
        className: "bg-rose-50 text-rose-600",
        badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
      };

    case "PARENT_UPDATED":
      return {
        label: "Parent Information",
        icon: UserRound,
        className: "bg-purple-50 text-purple-600",
        badgeClassName: "border-purple-200 bg-purple-50 text-purple-700",
      };

    case "DOCUMENT_UPLOADED":
      return {
        label: "Document Uploaded",
        icon: FileUp,
        className: "bg-cyan-50 text-cyan-600",
        badgeClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
      };

    case "DOCUMENT_DELETED":
      return {
        label: "Document Deleted",
        icon: FileUp,
        className: "bg-red-50 text-red-600",
        badgeClassName: "border-red-200 bg-red-50 text-red-700",
      };

    default:
      return {
        label: "Activity",
        icon: Activity,
        className: "bg-slate-50 text-slate-600",
        badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

export function StudentActivityTab({ studentId }: Props) {
  const [activities, setActivities] = useState<StudentActivity[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      try {
        setLoading(true);

        const response = await fetch(`/api/v1/students/${studentId}/activity`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !result.success) {
          setActivities([]);
          setError(true);
          return;
        }

        setActivities(result.data ?? []);
        setError(false);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load student activity:", err);

          setActivities([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />

        <div className="overflow-hidden rounded-2xl border">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex gap-4 border-b p-5 last:border-0">
              <div className="size-11 shrink-0 animate-pulse rounded-xl bg-muted" />

              <div className="flex-1 space-y-3">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-72 max-w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50">
            <AlertCircle className="size-7 text-rose-500" />
          </div>

          <h3 className="mt-4 font-semibold">Activity unavailable</h3>

          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Student activity could not be loaded.
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
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">Student Activity</h2>

              <p className="text-sm text-muted-foreground">
                History of important actions and changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Activity History</CardTitle>

          <p className="text-sm text-muted-foreground">
            {activities.length === 0
              ? "No activity recorded yet."
              : `${activities.length} activity ${
                  activities.length === 1 ? "record" : "records"
                }`}
          </p>
        </CardHeader>

        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                <Activity className="size-7 text-muted-foreground" />
              </div>

              <h3 className="mt-5 font-semibold">No activity yet</h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Important actions performed on this student will appear here
                automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => {
                const config = getActivityConfig(activity.type);

                const Icon = config.icon;

                return (
                  <div
                    key={activity.id}
                    className="flex gap-4 p-5 transition-colors hover:bg-muted/20 sm:p-6"
                  >
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${config.className}`}
                    >
                      <Icon className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{activity.title}</h3>

                            <Badge
                              variant="outline"
                              className={config.badgeClassName}
                            >
                              {config.label}
                            </Badge>
                          </div>

                          {activity.description && (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {activity.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 lg:text-right">
                          <p className="text-xs font-semibold text-foreground">
                            {formatDate(activity.createdAt)}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <UserRound className="size-3.5" />

                        <span>Performed by</span>

                        <span className="font-semibold text-foreground">
                          {activity.performedByUserId ?? "System"}
                        </span>

                        <ArrowRight className="size-3.5" />

                        <span>{config.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

            <div>
              <p className="font-semibold">Audit history</p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                SchoolDB records important student-related actions so
                administrators can track what changed and when.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
