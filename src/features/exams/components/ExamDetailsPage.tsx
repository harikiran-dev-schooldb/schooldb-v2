"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  ClipboardPenLine,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useRouter } from "next/navigation";

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

  /* ---------------------------------------------------------------------- */
  /* Load Exam + Schedules                                                  */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Initial Load                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return <div className="p-6">Loading exam...</div>;
  }

  /* ---------------------------------------------------------------------- */
  /* Not Found                                                              */
  /* ---------------------------------------------------------------------- */

  if (!exam) {
    return <div className="p-6">Exam not found.</div>;
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold">{exam.name}</h1>

          <p className="text-sm text-muted-foreground">
            Academic Year: {exam.academicYear.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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

          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Exam Information */}

      <Card>
        <CardHeader>
          <CardTitle>Exam Information</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Start Date</div>

            <div className="font-medium">{formatDate(exam.startDate)}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">End Date</div>

            <div className="font-medium">{formatDate(exam.endDate)}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Status</div>

            <div className="font-medium">{exam.status}</div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Schedules */}

      <Card>
        <CardHeader>
          <CardTitle>Exam Schedule ({schedules.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {schedules.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No schedules added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Class</th>

                    <th className="p-3">Section</th>

                    <th className="p-3">Subject</th>

                    <th className="p-3">Exam Date</th>

                    <th className="p-3">Time</th>

                    <th className="p-3 text-right">Max Marks</th>

                    <th className="p-3 text-right">Pass Marks</th>

                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-b">
                      <td className="p-3">{schedule.class.name}</td>

                      <td className="p-3">{schedule.section?.name || "All"}</td>

                      <td className="p-3 font-medium">
                        {schedule.subject.name}

                        {schedule.subject.code && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({schedule.subject.code})
                          </span>
                        )}
                      </td>

                      <td className="p-3">{formatDate(schedule.examDate)}</td>

                      <td className="p-3">
                        {schedule.startTime && schedule.endTime
                          ? `${schedule.startTime} - ${schedule.endTime}`
                          : schedule.startTime || "—"}
                      </td>

                      <td className="p-3 text-right">
                        {Number(schedule.maxMarks)}
                      </td>

                      <td className="p-3 text-right">
                        {schedule.passMarks !== null
                          ? Number(schedule.passMarks)
                          : "—"}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/${schoolSlug}/exams/${examId}/schedules/${schedule.id}/marks`,
                              )
                            }
                          >
                            <ClipboardPenLine className="mr-2 h-4 w-4" />
                            Enter Marks
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSchedule(schedule)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Schedule Dialog */}

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
