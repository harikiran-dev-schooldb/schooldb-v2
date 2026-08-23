"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  RefreshCw,
  Save,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StudentExamStatus = "PRESENT" | "ABSENT";

type StudentMark = {
  id: string | null;
  marksObtained: string | number | null;
  status: StudentExamStatus;
  remarks: string | null;
};

type StudentRow = {
  studentEnrollmentId: string;

  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
  };

  mark: StudentMark;
};

type ScheduleData = {
  id: string;
  examId: string;
  examName: string;
  academicYear: string;

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

  examDate: string;
  maxMarks: string | number;
  passMarks: string | number | null;
};

type MarksData = {
  schedule: ScheduleData;
  students: StudentRow[];
};

type Props = {
  schoolSlug: string;
  examId: string;
  scheduleId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function MarksEntryPage({ schoolSlug, examId, scheduleId }: Props) {
  const router = useRouter();

  const [data, setData] = useState<MarksData | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* LOAD DATA                                                              */
  /* ---------------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/exams/schedules/${scheduleId}/marks`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load marks.");
        return;
      }

      setData(result.data);

      setStudents(
        Array.isArray(result.data.students) ? result.data.students : [],
      );
    } catch (error) {
      console.error("Failed to load marks:", error);

      toast.error("Failed to load student marks.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  /* ---------------------------------------------------------------------- */
  /* UPDATE MARK                                                            */
  /* ---------------------------------------------------------------------- */

  function updateMarks(studentEnrollmentId: string, value: string) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              mark: {
                ...student.mark,
                marksObtained: value === "" ? null : value,
              },
            }
          : student,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UPDATE STATUS                                                          */
  /* ---------------------------------------------------------------------- */

  function updateStatus(
    studentEnrollmentId: string,
    status: StudentExamStatus,
  ) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              mark: {
                ...student.mark,
                status,
                marksObtained:
                  status === "ABSENT" ? null : student.mark.marksObtained,
              },
            }
          : student,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UPDATE REMARKS                                                         */
  /* ---------------------------------------------------------------------- */

  function updateRemarks(studentEnrollmentId: string, remarks: string) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              mark: {
                ...student.mark,
                remarks: remarks || null,
              },
            }
          : student,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* SUMMARY                                                                */
  /* ---------------------------------------------------------------------- */

  const presentCount = useMemo(
    () =>
      students.filter((student) => student.mark.status === "PRESENT").length,
    [students],
  );

  const absentCount = useMemo(
    () => students.filter((student) => student.mark.status === "ABSENT").length,
    [students],
  );

  const enteredCount = useMemo(
    () =>
      students.filter(
        (student) =>
          student.mark.status === "PRESENT" &&
          student.mark.marksObtained !== null &&
          student.mark.marksObtained !== "",
      ).length,
    [students],
  );

  const pendingCount = presentCount - enteredCount;

  const progress =
    students.length > 0
      ? Math.round((enteredCount / students.length) * 100)
      : 0;

  /* ---------------------------------------------------------------------- */
  /* SAVE                                                                   */
  /* ---------------------------------------------------------------------- */

  async function saveMarks() {
    if (!data) return;

    const maxMarks = Number(data.schedule.maxMarks);

    for (const student of students) {
      if (student.mark.status === "ABSENT") {
        continue;
      }

      if (
        student.mark.marksObtained !== null &&
        student.mark.marksObtained !== ""
      ) {
        const marks = Number(student.mark.marksObtained);

        if (!Number.isFinite(marks)) {
          toast.error(
            `Invalid marks for ${
              student.student.fullName || student.student.admissionNo
            }.`,
          );
          return;
        }

        if (marks < 0 || marks > maxMarks) {
          toast.error(
            `Marks for ${
              student.student.fullName || student.student.admissionNo
            } must be between 0 and ${maxMarks}.`,
          );
          return;
        }
      }
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/v1/exams/schedules/${scheduleId}/marks`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            marks: students.map((student) => ({
              studentEnrollmentId: student.studentEnrollmentId,

              marksObtained:
                student.mark.status === "ABSENT"
                  ? null
                  : student.mark.marksObtained === null ||
                      student.mark.marksObtained === ""
                    ? null
                    : Number(student.mark.marksObtained),

              status: student.mark.status,

              remarks: student.mark.remarks || null,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to save marks.");
        return;
      }

      toast.success("Student marks saved successfully.");

      await loadData();
    } catch (error) {
      console.error("Save marks error:", error);

      toast.error("Failed to save student marks.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="rounded-2xl border-border/60">
              <CardContent className="p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-7 w-14 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardContent className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((item) => (
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

  /* ---------------------------------------------------------------------- */
  /* NOT FOUND                                                              */
  /* ---------------------------------------------------------------------- */

  if (!data) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="size-6 text-muted-foreground" />
          </div>

          <h2 className="mt-4 font-semibold">Marks data not found</h2>

          <Button
            variant="outline"
            className="mt-5 rounded-xl"
            onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Exam
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { schedule } = data;

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-7">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Exam
        </button>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Marks Entry
              </span>

              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">
                {schedule.academicYear}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {schedule.subject.name}
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              {schedule.examName}
              {" • "}
              {schedule.class.name}
              {schedule.section ? ` • ${schedule.section.name}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void loadData()}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>

            <Button
              className="rounded-xl"
              disabled={saving}
              onClick={() => void saveMarks()}
            >
              <Save className="mr-2 size-4" />
              {saving ? "Saving..." : "Save Marks"}
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Schedule summary                                                   */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400" />

        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem
              icon={<Users className="size-5" />}
              label="Class"
              value={
                schedule.section
                  ? `${schedule.class.name} - ${schedule.section.name}`
                  : schedule.class.name
              }
            />

            <SummaryItem
              icon={<CalendarDays className="size-5" />}
              label="Exam Date"
              value={formatDate(schedule.examDate)}
            />

            <SummaryItem
              icon={<BarChart3 className="size-5" />}
              label="Maximum Marks"
              value={String(Number(schedule.maxMarks))}
            />

            <SummaryItem
              icon={<CheckCircle2 className="size-5" />}
              label="Pass Marks"
              value={
                schedule.passMarks !== null
                  ? String(Number(schedule.passMarks))
                  : "Not set"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Progress                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={students.length}
          icon={<Users className="size-5" />}
        />

        <StatCard
          label="Marks Entered"
          value={enteredCount}
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />

        <StatCard
          label="Pending"
          value={pendingCount}
          icon={<Clock3 className="size-5" />}
          tone="warning"
        />

        <StatCard
          label="Absent"
          value={absentCount}
          icon={<XCircle className="size-5" />}
          tone="danger"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Progress bar                                                       */}
      {/* ------------------------------------------------------------------ */}

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Entry Progress</p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {enteredCount} of {students.length} students have marks entered.
              </p>
            </div>

            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Student marks                                                      */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />

              <h2 className="font-semibold">Student Marks</h2>

              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                {students.length}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Enter marks and attendance for each student.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            Maximum:{" "}
            <span className="font-semibold text-foreground">
              {Number(schedule.maxMarks)}
            </span>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold">No students found</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              No students are currently enrolled in this class and section.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/[0.3]">
                    <th className="w-14 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      #
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Student
                    </th>

                    <th className="w-44 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Marks
                    </th>

                    <th className="w-36 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="w-72 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => {
                    const absent = student.mark.status === "ABSENT";

                    return (
                      <tr
                        key={student.studentEnrollmentId}
                        className={`border-b border-border/50 transition-colors last:border-0 ${
                          absent ? "bg-muted/[0.35]" : "hover:bg-muted/[0.2]"
                        }`}
                      >
                        <td className="px-4 py-4 text-center text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold">
                            {student.student.fullName || "Unnamed Student"}
                          </div>

                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {student.student.admissionNo}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Input
                            type="number"
                            min="0"
                            max={Number(schedule.maxMarks)}
                            step="0.01"
                            value={
                              student.mark.marksObtained === null
                                ? ""
                                : student.mark.marksObtained
                            }
                            disabled={saving || absent}
                            onChange={(event) =>
                              updateMarks(
                                student.studentEnrollmentId,
                                event.target.value,
                              )
                            }
                            className="h-10 rounded-lg text-center text-base font-semibold"
                            placeholder="—"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-1 rounded-lg bg-muted p-1">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                updateStatus(
                                  student.studentEnrollmentId,
                                  "PRESENT",
                                )
                              }
                              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                !absent
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Present
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                updateStatus(
                                  student.studentEnrollmentId,
                                  "ABSENT",
                                )
                              }
                              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                absent
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Input
                            placeholder="Optional remarks"
                            value={student.mark.remarks || ""}
                            disabled={saving}
                            onChange={(event) =>
                              updateRemarks(
                                student.studentEnrollmentId,
                                event.target.value,
                              )
                            }
                            className="h-10 rounded-lg"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-border/50 lg:hidden">
              {students.map((student, index) => {
                const absent = student.mark.status === "ABSENT";

                return (
                  <div
                    key={student.studentEnrollmentId}
                    className={`p-5 ${absent ? "bg-muted/[0.35]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {student.student.fullName || "Unnamed Student"}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.student.admissionNo}
                          </p>
                        </div>
                      </div>

                      {absent ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Absent
                        </span>
                      ) : (
                        <span className="rounded-full bg-primary/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Present
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                          Marks / {Number(schedule.maxMarks)}
                        </label>

                        <Input
                          type="number"
                          min="0"
                          max={Number(schedule.maxMarks)}
                          step="0.01"
                          value={
                            student.mark.marksObtained === null
                              ? ""
                              : student.mark.marksObtained
                          }
                          disabled={saving || absent}
                          onChange={(event) =>
                            updateMarks(
                              student.studentEnrollmentId,
                              event.target.value,
                            )
                          }
                          className="h-11 rounded-xl text-center text-base font-semibold"
                          placeholder="Enter marks"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                          Status
                        </label>

                        <div className="flex h-11 gap-1 rounded-xl bg-muted p-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(
                                student.studentEnrollmentId,
                                "PRESENT",
                              )
                            }
                            className={`flex-1 rounded-lg text-xs font-semibold ${
                              !absent
                                ? "bg-background shadow-sm"
                                : "text-muted-foreground"
                            }`}
                          >
                            Present
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(
                                student.studentEnrollmentId,
                                "ABSENT",
                              )
                            }
                            className={`flex-1 rounded-lg text-xs font-semibold ${
                              absent
                                ? "bg-background shadow-sm"
                                : "text-muted-foreground"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Input
                        placeholder="Optional remarks"
                        value={student.mark.remarks || ""}
                        disabled={saving}
                        onChange={(event) =>
                          updateRemarks(
                            student.studentEnrollmentId,
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom save action                                                 */}
      {/* ------------------------------------------------------------------ */}

      {students.length > 0 && (
        <div className="sticky bottom-4 z-20">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-[0_12px_40px_rgb(15_23_42_/_0.14)] backdrop-blur-xl">
            <div className="hidden min-w-0 sm:block">
              <p className="text-sm font-semibold">
                {enteredCount} of {students.length} marks entered
              </p>

              <p className="text-xs text-muted-foreground">
                {absentCount} absent
                {pendingCount > 0
                  ? ` • ${pendingCount} pending`
                  : " • All marks entered"}
              </p>
            </div>

            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={saving}
                onClick={() => void loadData()}
              >
                <RefreshCw className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                className="rounded-xl"
                disabled={saving}
                onClick={() => void saveMarks()}
              >
                <Save className="size-4 sm:mr-2" />
                {saving ? "Saving..." : "Save Marks"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                 */
/* -------------------------------------------------------------------------- */

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/[0.25] p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-primary/[0.07] text-primary",
    success: "bg-emerald-500/[0.08] text-emerald-600",
    warning: "bg-amber-500/[0.08] text-amber-600",
    danger: "bg-red-500/[0.08] text-red-600",
  }[tone];

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          </div>

          <div
            className={`flex size-10 items-center justify-center rounded-xl ${toneClass}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
