"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardPenLine,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  ClipboardEdit,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EditExamScheduleDialog } from "@/features/exams/components/EditExamScheduleDialog";
import { CreateExamScheduleDialog } from "./CreateExamScheduleDialog";

type Exam = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;

  academicYear: {
    id: string;
    name: string;
  };
};

type ExamSchedule = {
  id: string;

  examDate: string;
  startTime: string | null;
  endTime: string | null;

  maxMarks: string | number;
  passMarks: string | number | null;

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  } | null;

  subject: {
    id: string;
    name: string;
    code: string | null;
  };
};

type Props = {
  schoolSlug: string;
  examId: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("active") || normalized.includes("ongoing")) {
    return "border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300";
  }

  if (normalized.includes("complete") || normalized.includes("closed")) {
    return "border-muted-foreground/15 bg-muted text-muted-foreground";
  }

  return "border-blue-500/15 bg-blue-500/[0.08] text-blue-700 dark:text-blue-300";
}

export function ExamDetailsPage({ schoolSlug, examId }: Props) {
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);

  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(
    null,
  );

  const [deleteScheduleOpen, setDeleteScheduleOpen] = useState(false);

  const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(
    null,
  );

  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [examResponse, schedulesResponse] = await Promise.all([
        fetch(`/api/v1/exams/${examId}`, {
          cache: "no-store",
        }),

        fetch(`/api/v1/exams/${examId}/schedules`, {
          cache: "no-store",
        }),
      ]);

      const examResult = await examResponse.json();
      const schedulesResult = await schedulesResponse.json();

      if (!examResponse.ok || !examResult.success) {
        toast.error(examResult.message || "Failed to load exam.");
        return;
      }

      if (!schedulesResponse.ok || !schedulesResult.success) {
        toast.error(
          schedulesResult.message || "Failed to load exam schedules.",
        );
        return;
      }

      setExam(examResult.data);

      setSchedules(
        Array.isArray(schedulesResult.data) ? schedulesResult.data : [],
      );
    } catch (error) {
      console.error("Failed to load exam details:", error);

      toast.error("Failed to load exam details.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  function handleEditSchedule(schedule: ExamSchedule) {
    setSelectedSchedule(schedule);
    setEditScheduleOpen(true);
  }

  function handleDeleteSchedule(schedule: ExamSchedule) {
    setScheduleToDelete(schedule);
    setDeleteScheduleOpen(true);
  }

  async function confirmDeleteSchedule() {
    if (!scheduleToDelete) return;

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/v1/exams/${examId}/schedules/${scheduleToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to delete exam schedule.");
        return;
      }

      toast.success("Exam schedule deleted successfully.");

      setDeleteScheduleOpen(false);
      setScheduleToDelete(null);

      await loadData();
    } catch (error) {
      console.error("Delete exam schedule error:", error);

      toast.error("Failed to delete exam schedule.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  const totalClasses = useMemo(() => {
    return new Set(schedules.map((schedule) => schedule.class.id)).size;
  }, [schedules]);

  const totalSubjects = useMemo(() => {
    return new Set(schedules.map((schedule) => schedule.subject.id)).size;
  }, [schedules]);

  const totalSections = useMemo(() => {
    return new Set(
      schedules.map((schedule) => schedule.section?.id).filter(Boolean),
    ).size;
  }, [schedules]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />

        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="rounded-2xl border-border/60">
              <CardContent className="p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardContent className="space-y-4 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="size-6 text-muted-foreground" />
          </div>

          <h2 className="mt-4 font-semibold">Exam not found</h2>

          <Button
            variant="outline"
            className="mt-5 rounded-xl"
            onClick={() => router.push(`/${schoolSlug}/exams`)}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Exams
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* -------------------------------------------------------------- */}
      {/* Header                                                         */}
      {/* -------------------------------------------------------------- */}

      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push(`/${schoolSlug}/exams`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Exams
        </button>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Examination
              </span>

              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(exam.status)}`}
              >
                {exam.status}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {exam.name}
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Academic Year {exam.academicYear.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadData()}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                router.push(`/${schoolSlug}/exams/${examId}/marks`)
              }
            >
              <ClipboardEdit className="mr-2 h-4 w-4" />
              Enter Results
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                router.push(`/${schoolSlug}/exams/${examId}/results`)
              }
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Results
            </Button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Overview                                                        */}
      {/* -------------------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Schedules
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {schedules.length}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
                <ClipboardList className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Subjects
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {totalSubjects}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/[0.08] text-blue-600">
                <ClipboardPenLine className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Classes
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {totalClasses}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/[0.08] text-violet-600">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Sections
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {totalSections}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/[0.08] text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Exam information                                                */}
      {/* -------------------------------------------------------------- */}

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400" />

        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
              <CalendarDays className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">Examination Period</h2>

              <p className="text-xs text-muted-foreground">
                Scheduled examination window
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/[0.3] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Start Date
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDate(exam.startDate)}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/[0.3] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                End Date
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDate(exam.endDate)}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/[0.3] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Status
              </p>

              <p className="mt-2 text-sm font-semibold">{exam.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* Schedule                                                        */}
      {/* -------------------------------------------------------------- */}

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />

              <h2 className="font-semibold">Exam Schedule</h2>

              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                {schedules.length}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Manage subjects, classes, dates and marks.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setScheduleOpen(true)}
          >
            <Plus className="mr-2 size-3.5" />
            Add Schedule
          </Button>
        </div>

        {schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
              <CalendarDays className="size-6" />
            </div>

            <h3 className="mt-4 font-semibold">No schedules yet</h3>

            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Add subjects and examination dates to build the schedule for this
              exam.
            </p>

            <Button
              className="mt-5 rounded-xl"
              onClick={() => setScheduleOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              Add First Schedule
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/[0.3]">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Class
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Subject
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Date & Time
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Marks
                    </th>

                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className="group border-b border-border/50 transition-colors last:border-0 hover:bg-muted/[0.25]"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold">
                          {schedule.class.name}
                        </div>

                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {schedule.section?.name || "All sections"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold">
                          {schedule.subject.name}
                        </div>

                        {schedule.subject.code && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {schedule.subject.code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/[0.07] text-primary">
                            <CalendarDays className="size-4" />
                          </div>

                          <div>
                            <div className="font-medium">
                              {formatDate(schedule.examDate)}
                            </div>

                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock3 className="size-3" />

                              {schedule.startTime && schedule.endTime
                                ? `${schedule.startTime} - ${schedule.endTime}`
                                : schedule.startTime || "Time not set"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="font-semibold">
                          {Number(schedule.maxMarks)}
                        </div>

                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Pass{" "}
                          {schedule.passMarks !== null
                            ? Number(schedule.passMarks)
                            : "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="rounded-lg"
                            onClick={() =>
                              router.push(
                                `/${schoolSlug}/exams/${examId}/schedules/${schedule.id}/marks`,
                              )
                            }
                          >
                            <ClipboardPenLine className="mr-1.5 size-3.5" />
                            Marks
                          </Button>

                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                            title="Edit schedule"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg text-destructive hover:bg-destructive/5 hover:text-destructive"
                            title="Delete schedule"
                            onClick={() => handleDeleteSchedule(schedule)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-border/50 lg:hidden">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {schedule.class.name}
                        {" • "}
                        {schedule.section?.name || "All sections"}
                      </p>

                      <h3 className="mt-1 font-semibold">
                        {schedule.subject.name}
                      </h3>

                      {schedule.subject.code && (
                        <p className="text-xs text-muted-foreground">
                          {schedule.subject.code}
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg bg-muted p-2">
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-muted/[0.25] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Date
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(schedule.examDate)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/[0.25] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Marks
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {Number(schedule.maxMarks)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />

                    {schedule.startTime && schedule.endTime
                      ? `${schedule.startTime} - ${schedule.endTime}`
                      : schedule.startTime || "Time not set"}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      className="flex-1 rounded-xl"
                      onClick={() =>
                        router.push(
                          `/${schoolSlug}/exams/${examId}/schedules/${schedule.id}/marks`,
                        )
                      }
                    >
                      <ClipboardPenLine className="mr-2 size-4" />
                      Enter Marks
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => handleEditSchedule(schedule)}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl text-destructive hover:text-destructive"
                      onClick={() => handleDeleteSchedule(schedule)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* Dialogs                                                         */}
      {/* -------------------------------------------------------------- */}

      <CreateExamScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        examId={examId}
        schoolSlug={schoolSlug}
        startDate={exam.startDate}
        endDate={exam.endDate}
        onSuccess={() => void loadData()}
      />

      <EditExamScheduleDialog
        open={editScheduleOpen}
        onOpenChange={setEditScheduleOpen}
        examId={examId}
        schedule={selectedSchedule}
        startDate={exam.startDate}
        endDate={exam.endDate}
        onSuccess={() => void loadData()}
      />

      <AlertDialog
        open={deleteScheduleOpen}
        onOpenChange={(open) => {
          if (deleting) return;

          setDeleteScheduleOpen(open);

          if (!open) {
            setScheduleToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam Schedule?</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete this exam schedule?
              {scheduleToDelete && (
                <>
                  <br />
                  <br />

                  <strong>
                    {scheduleToDelete.class.name}
                    {scheduleToDelete.section
                      ? ` - ${scheduleToDelete.section.name}`
                      : ""}
                    {" • "}
                    {scheduleToDelete.subject.name}
                  </strong>
                </>
              )}
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteSchedule();
              }}
            >
              {deleting ? "Deleting..." : "Delete Schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
