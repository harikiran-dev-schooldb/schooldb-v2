"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  FileText,
  UserRound,
  Target,
  TrendingUp,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileBarChart,
  GraduationCap,
  Hash,
  ClipboardCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SubjectResult = {
  scheduleId: string;

  subject: {
    id: string;
    name: string;
    code: string | null;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  } | null;

  examDate: string;

  maxMarks: number;
  passMarks: number | null;
  marksObtained: number | null;

  status: string;
  resultStatus: "PASS" | "FAIL" | "ABSENT";

  remarks: string | null;
};

type AttendanceSummary = {
  upToDate: string | null;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
};

type StudentResultData = {
  exam: {
    id: string;
    name: string;

    academicYear: {
      id: string;
      name: string;
    };
  };

  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
  };

  summary: {
    totalSubjects: number;
    passedSubjects: number;
    failedSubjects: number;
    absentSubjects: number;

    totalObtained: number;
    totalMaxMarks: number;

    percentage: number;
    status: "PASS" | "FAIL";

    attendance: AttendanceSummary;
  };

  subjects: SubjectResult[];
};

type Props = {
  schoolSlug: string;
  examId: string;
  studentId: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function StudentResultDetailsPage({
  schoolSlug,
  examId,
  studentId,
}: Props) {
  const router = useRouter();

  const [data, setData] = useState<StudentResultData | null>(null);

  const [loading, setLoading] = useState(true);

  const loadResult = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/exams/${examId}/results/${studentId}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load student result.");
        return;
      }

      setData(result.data);
    } catch (error) {
      console.error("Failed to load student result:", error);

      toast.error("Failed to load student result.");
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadResult();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadResult]);

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />

          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-4 h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="h-72 animate-pulse bg-muted/20" />
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* NOT FOUND                                                              */
  /* ---------------------------------------------------------------------- */

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <AlertCircle className="size-8 text-muted-foreground" />
        </div>

        <h2 className="mt-5 text-xl font-bold">Result Not Found</h2>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          We couldn&apos;t retrieve the result information for this student.
        </p>

        <Button
          className="mt-5"
          variant="outline"
          onClick={() => router.push(`/${schoolSlug}/exams/${examId}/results`)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Results
        </Button>
      </div>
    );
  }

  const attendance = data.summary.attendance;

  const isPass = data.summary.status === "PASS";

  const attendancePercentage = Math.min(
    Math.max(attendance.percentage, 0),
    100,
  );

  return (
    <div className="space-y-6 p-6 md:p-8 print:space-y-5 print:p-0">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() =>
              router.push(`/${schoolSlug}/exams/${examId}/results`)
            }
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Student Result
              </h1>

              <span
                className={
                  isPass
                    ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600"
                    : "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                }
              >
                {data.summary.status}
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {data.exam.name}
              <span className="mx-2">•</span>
              Academic Year: {data.exam.academicYear.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadResult()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>

          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>

          <Button
            onClick={() =>
              router.push(
                `/${schoolSlug}/exams/${examId}/results/${studentId}/report-card`,
              )
            }
          >
            <FileText className="mr-2 size-4" />
            Report Card
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PRINT HEADER                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div className="hidden border-b-2 border-black pb-4 print:block">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase">Student Result</h1>

            <p className="mt-1 text-sm">
              {data.exam.name} • {data.exam.academicYear.name}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold uppercase">Admission No.</div>

            <div className="text-lg font-bold">{data.student.admissionNo}</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* STUDENT PROFILE                                                    */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden border-border/70 shadow-sm print:rounded-none print:border-black print:shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-7" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Student
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {data.student.fullName || "Unnamed Student"}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="size-3.5" />
                    {data.student.admissionNo}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="size-3.5" />
                    {data.subjects[0]?.class.name || "Class"}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <UsersIcon />
                    {data.subjects[0]?.section?.name || "All Sections"}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={
                isPass
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center"
                  : "rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-center"
              }
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Final Result
              </div>

              <div
                className={
                  isPass
                    ? "mt-1 text-2xl font-black text-emerald-600"
                    : "mt-1 text-2xl font-black text-destructive"
                }
              >
                {data.summary.status}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* RESULT SUMMARY                                                     */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={<Target className="size-5" />}
          label="Total Marks"
          value={`${data.summary.totalObtained} / ${data.summary.totalMaxMarks}`}
        />

        <SummaryCard
          icon={<TrendingUp className="size-5" />}
          label="Percentage"
          value={`${data.summary.percentage.toFixed(2)}%`}
        />

        <SummaryCard
          icon={<BookOpen className="size-5" />}
          label="Subjects Passed"
          value={`${data.summary.passedSubjects} / ${data.summary.totalSubjects}`}
          description={
            data.summary.failedSubjects > 0
              ? `${data.summary.failedSubjects} failed`
              : "All subjects passed"
          }
        />

        <SummaryCard
          icon={<CalendarDays className="size-5" />}
          label="Attendance"
          value={`${attendance.percentage.toFixed(2)}%`}
          description={`${attendance.presentDays} of ${attendance.totalDays} days`}
        />

        <Card
          className={
            isPass
              ? "border-emerald-200 bg-emerald-50 shadow-sm"
              : "border-red-200 bg-red-50 shadow-sm"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Final Result
              </p>

              {isPass ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <XCircle className="size-5 text-destructive" />
              )}
            </div>

            <div
              className={
                isPass
                  ? "mt-3 text-2xl font-black text-emerald-600"
                  : "mt-3 text-2xl font-black text-destructive"
              }
            >
              {data.summary.status}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {data.summary.passedSubjects} passed
              {data.summary.failedSubjects > 0 &&
                ` • ${data.summary.failedSubjects} failed`}
              {data.summary.absentSubjects > 0 &&
                ` • ${data.summary.absentSubjects} absent`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ATTENDANCE                                                         */}
      {/* ------------------------------------------------------------------ */}

      <Card className="border-border/70 shadow-sm print:rounded-none print:border-black print:shadow-none">
        <CardHeader className="border-b bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" />

            <div>
              <CardTitle className="text-base">Attendance Summary</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Overall attendance up to {formatDate(attendance.upToDate)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <AttendanceMetric
              label="Present Days"
              value={attendance.presentDays}
              icon={<CheckCircle2 className="size-4" />}
              valueClass="text-emerald-600"
            />

            <AttendanceMetric
              label="Absent Days"
              value={attendance.absentDays}
              icon={<XCircle className="size-4" />}
              valueClass="text-destructive"
            />

            <AttendanceMetric
              label="Working Days"
              value={attendance.totalDays}
              icon={<CalendarDays className="size-4" />}
              valueClass="text-foreground"
            />

            <AttendanceMetric
              label="Attendance"
              value={`${attendance.percentage.toFixed(2)}%`}
              icon={<TrendingUp className="size-4" />}
              valueClass="text-primary"
            />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                Attendance Percentage
              </span>

              <span>{attendance.percentage.toFixed(2)}%</span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${attendancePercentage}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* SUBJECT RESULTS                                                    */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden border-border/70 shadow-sm print:rounded-none print:border-black print:shadow-none">
        <CardHeader className="border-b bg-muted/20 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart className="size-5 text-primary" />

              <div>
                <CardTitle className="text-base">
                  Subject-wise Results
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Detailed performance for each scheduled subject
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-semibold">
              {data.subjects.length} Subjects
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {data.subjects.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <BookOpen className="size-6 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-semibold">No subject results</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                No marks have been recorded for this student yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold">
                      Subject
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold">
                      Exam Date
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold">
                      Max
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold">
                      Pass
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold">
                      Obtained
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold">
                      Result
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.subjects.map((subject) => (
                    <tr
                      key={subject.scheduleId}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {subject.subject.name}
                        </div>

                        {subject.subject.code && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {subject.subject.code}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(subject.examDate)}
                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        {subject.maxMarks}
                      </td>

                      <td className="px-5 py-4 text-right text-muted-foreground">
                        {subject.passMarks ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {subject.resultStatus === "ABSENT" ? (
                          <span className="font-semibold text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <span className="font-bold">
                            {subject.marksObtained ?? "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={subject.status} />
                      </td>

                      <td className="px-5 py-4 text-center">
                        <ResultBadge status={subject.resultStatus} />
                      </td>

                      <td className="max-w-[220px] px-5 py-4 text-muted-foreground">
                        {subject.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <span className="font-medium text-foreground">{data.exam.name}</span>{" "}
          • {data.exam.academicYear.name}
        </div>

        <div>
          Result generated for{" "}
          <span className="font-medium text-foreground">
            {data.student.fullName || "Unnamed Student"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>

            <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>

            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* ATTENDANCE METRIC                                                          */
/* -------------------------------------------------------------------------- */

function AttendanceMetric({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>

      <div className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  if (status === "ABSENT") {
    return (
      <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
        ABSENT
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
      {status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* RESULT BADGE                                                               */
/* -------------------------------------------------------------------------- */

function ResultBadge({ status }: { status: "PASS" | "FAIL" | "ABSENT" }) {
  if (status === "PASS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
        <CheckCircle2 className="size-3.5" />
        PASS
      </span>
    );
  }

  if (status === "ABSENT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
        <AlertCircle className="size-3.5" />
        ABSENT
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
      <XCircle className="size-3.5" />
      FAIL
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* SMALL USERS ICON                                                           */
/* -------------------------------------------------------------------------- */

function UsersIcon() {
  return (
    <span className="inline-flex items-center justify-center">
      <UserRound className="size-3.5" />
    </span>
  );
}
