"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Exam = {
  id: string;
  name: string;

  startDate: string;
  endDate: string;

  academicYear: {
    id: string;
    name: string;
  };

  _count: {
    schedules: number;
  };
};

type Props = {
  onCreate?: () => void;
  onEdit?: (exam: Exam) => void;
  onDelete?: (exam: Exam) => void;
  schoolSlug: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getExamStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return {
      label: "Upcoming",
      className:
        "border-blue-500/15 bg-blue-500/[0.07] text-blue-700 dark:text-blue-300",
    };
  }

  if (now > end) {
    return {
      label: "Completed",
      className: "border-muted-foreground/15 bg-muted text-muted-foreground",
    };
  }

  return {
    label: "Active",
    className:
      "border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300",
  };
}

export function ExamList({ schoolSlug, onCreate, onEdit, onDelete }: Props) {
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/exams", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load exams.");
      }

      setExams(result.data ?? []);
    } catch (error) {
      console.error("Failed to load exams:", error);

      setError(
        error instanceof Error ? error.message : "Failed to load exams.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadExams();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadExams]);

  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card
            key={item}
            className="overflow-hidden rounded-2xl border-border/60 shadow-sm"
          >
            <CardContent className="p-0">
              <div className="h-1 bg-muted animate-pulse" />

              <div className="space-y-5 p-6">
                <div className="h-5 w-2/3 animate-pulse rounded-lg bg-muted" />

                <div className="h-4 w-1/3 animate-pulse rounded-lg bg-muted" />

                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-destructive/20">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <RefreshCw className="size-5" />
          </div>

          <div>
            <h3 className="font-semibold">Unable to load exams</h3>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>

          <Button variant="outline" onClick={() => void loadExams()}>
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (exams.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="size-6" />
          </div>

          <div className="mt-5 max-w-md">
            <h3 className="text-base font-semibold">No examinations yet</h3>

            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Create your first examination to start managing schedules, marks
              and results.
            </p>
          </div>

          {onCreate && (
            <Button className="mt-6" onClick={onCreate}>
              <Plus className="mr-2 size-4" />
              Create Exam
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {exams.length} {exams.length === 1 ? "examination" : "examinations"}
          </p>

          <p className="text-xs text-muted-foreground">
            Manage your school&apos;s examination cycles.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadExams()}
          className="rounded-xl"
        >
          <RefreshCw className="mr-2 size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Exam Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam) => {
          const status = getExamStatus(exam.startDate, exam.endDate);

          return (
            <Card
              key={exam.id}
              className={cn(
                "group overflow-hidden rounded-2xl border-border/60",
                "bg-card shadow-sm",
                "transition-all duration-300",
                "hover:-translate-y-0.5 hover:border-primary/20",
                "hover:shadow-[0_18px_45px_rgb(15_23_42_/_0.08)]",
              )}
            >
              <CardContent className="p-0">
                {/* Accent */}
                <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400" />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() =>
                        router.push(`/${schoolSlug}/exams/${exam.id}`)
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Examination
                        </span>

                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-base font-bold tracking-tight group-hover:text-primary">
                        {exam.name}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Academic Year {exam.academicYear.name}
                      </p>
                    </button>

                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
                      <ClipboardList className="size-5" />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-muted/[0.35] p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="size-3" />
                        Start
                      </div>

                      <p className="mt-1.5 text-sm font-semibold">
                        {formatDate(exam.startDate)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/[0.35] p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="size-3" />
                        End
                      </div>

                      <p className="mt-1.5 text-sm font-semibold">
                        {formatDate(exam.endDate)}
                      </p>
                    </div>
                  </div>

                  {/* Schedule count */}
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/[0.07] text-primary">
                        <ClipboardList className="size-4" />
                      </div>

                      <span className="text-sm text-muted-foreground">
                        Subjects scheduled
                      </span>
                    </div>

                    <span className="text-lg font-bold">
                      {exam._count.schedules}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
                    <Button
                      type="button"
                      className="flex-1 rounded-xl"
                      onClick={() =>
                        router.push(`/${schoolSlug}/exams/${exam.id}`)
                      }
                    >
                      Open Exam
                      <ArrowUpRight className="ml-1.5 size-4" />
                    </Button>

                    {onEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        title="Edit exam"
                        onClick={() => onEdit(exam)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}

                    {onDelete && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-xl text-destructive hover:bg-destructive/5 hover:text-destructive"
                        title="Delete exam"
                        onClick={() => onDelete(exam)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
