"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Printer,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import Image from "next/image";

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
  school: {
    id: string;
    name: string;
    slug: string;
    logo: string;
  };

  exam: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;

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

export function StudentReportCardPage({
  schoolSlug,
  examId,
  studentId,
}: Props) {
  const router = useRouter();

  const [data, setData] = useState<StudentResultData | null>(null);

  const [loading, setLoading] = useState(true);

  const loadReportCard = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/exams/${examId}/results/${studentId}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load report card.");
      }

      setData(result.data);
    } catch (error) {
      console.error("Failed to load report card:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to load report card.",
      );
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReportCard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReportCard]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />

          <p className="text-sm text-muted-foreground">
            Preparing report card...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Report card not found</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Unable to load the student&apos; report card.
          </p>
        </div>
      </div>
    );
  }

  const attendance = data.summary.attendance;

  const className = data.subjects[0]?.class.name || "—";

  const sectionName = data.subjects[0]?.section?.name || "—";

  const isPass = data.summary.status === "PASS";

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-6 print:bg-white print:p-0">
      {/* ACTION BAR */}

      <div className="mx-auto mb-5 flex max-w-5xl flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/${schoolSlug}/exams/${examId}/results/${studentId}`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Result
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadReportCard()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report Card
          </Button>
        </div>
      </div>

      {/* REPORT CARD */}

      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border bg-background shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        {/* SCHOOL HEADER */}

        <div className="border-b-2 border-primary px-6 py-6 md:px-10">
          <div className="flex items-center justify-center gap-5">
            {data.school.logo ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white p-1">
                <Image
                  src={data.school.logo}
                  alt={`${data.school.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border bg-muted text-2xl font-bold">
                {data.school.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="text-center">
              <h1 className="text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                {data.school.name}
              </h1>

              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Academic Progress Report
              </p>

              <div className="mt-3">
                <h2 className="text-lg font-bold">{data.exam.name}</h2>

                <p className="mt-1 text-sm">
                  Academic Year:{" "}
                  <span className="font-semibold">
                    {data.exam.academicYear.name}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RESULT STATUS */}

        <div
          className={
            isPass
              ? "border-b bg-green-50 px-6 py-4 print:bg-transparent"
              : "border-b bg-red-50 px-6 py-4 print:bg-transparent"
          }
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {isPass ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}

              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Overall Result
                </div>

                <div
                  className={
                    isPass
                      ? "text-2xl font-bold text-green-700"
                      : "text-2xl font-bold text-destructive"
                  }
                >
                  {data.summary.status}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-muted-foreground">
                Overall Percentage
              </div>

              <div className="text-2xl font-bold">
                {data.summary.percentage.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          {/* STUDENT INFORMATION */}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />

              <h2 className="font-bold tracking-tight">Student Information</h2>
            </div>

            <div className="grid overflow-hidden rounded-xl border sm:grid-cols-2">
              <div className="border-b p-4 sm:border-r">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Student Name
                </div>

                <div className="mt-1 font-semibold">
                  {data.student.fullName || "Unnamed Student"}
                </div>
              </div>

              <div className="border-b p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Admission Number
                </div>

                <div className="mt-1 font-semibold">
                  {data.student.admissionNo}
                </div>
              </div>

              <div className="border-b p-4 sm:border-b-0 sm:border-r">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Class
                </div>

                <div className="mt-1 font-semibold">{className}</div>
              </div>

              <div className="p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Section
                </div>

                <div className="mt-1 font-semibold">{sectionName}</div>
              </div>
            </div>
          </section>

          {/* PERFORMANCE SUMMARY */}

          <section className="mt-8">
            <h2 className="mb-4 font-bold tracking-tight">
              Performance Summary
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total Marks
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {data.summary.totalObtained}
                  <span className="text-base text-muted-foreground">
                    {" "}
                    / {data.summary.totalMaxMarks}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Percentage
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {data.summary.percentage.toFixed(2)}%
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Subjects Passed
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {data.summary.passedSubjects}
                  <span className="text-base text-muted-foreground">
                    {" "}
                    / {data.summary.totalSubjects}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Attendance
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {attendance.percentage.toFixed(2)}%
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {attendance.presentDays} / {attendance.totalDays} days
                </div>
              </div>
            </div>
          </section>

          {/* SCHOLASTIC PERFORMANCE */}

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold tracking-tight">
                  Scholastic Performance
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Subject-wise examination performance
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs font-medium">
                {data.summary.totalSubjects} Subjects
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-14 px-4 py-3 text-center font-semibold">
                      S.No
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      Subject
                    </th>

                    <th className="px-4 py-3 text-center font-semibold">Max</th>

                    <th className="px-4 py-3 text-center font-semibold">
                      Pass
                    </th>

                    <th className="px-4 py-3 text-center font-semibold">
                      Obtained
                    </th>

                    <th className="px-4 py-3 text-center font-semibold">
                      Result
                    </th>

                    <th className="px-4 py-3 text-left font-semibold">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.subjects.map((subject, index) => (
                    <tr
                      key={subject.scheduleId}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {subject.subject.name}
                        </div>

                        {subject.subject.code && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {subject.subject.code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {subject.maxMarks}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {subject.passMarks ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold">
                        {subject.resultStatus === "ABSENT"
                          ? "ABSENT"
                          : (subject.marksObtained ?? "—")}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            subject.resultStatus === "PASS"
                              ? "inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                              : subject.resultStatus === "ABSENT"
                                ? "inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700"
                                : "inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                          }
                        >
                          {subject.resultStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {subject.remarks || "—"}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-muted/40 font-bold">
                    <td colSpan={2} className="px-4 py-4 text-right">
                      TOTAL
                    </td>

                    <td className="px-4 py-4 text-center">
                      {data.summary.totalMaxMarks}
                    </td>

                    <td className="px-4 py-4 text-center">—</td>

                    <td className="px-4 py-4 text-center">
                      {data.summary.totalObtained}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {data.summary.percentage.toFixed(2)}%
                    </td>

                    <td className="px-4 py-4">{data.summary.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ATTENDANCE */}

          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-bold tracking-tight">Attendance Summary</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Attendance calculated up to{" "}
                  <span className="font-medium">
                    {formatDate(attendance.upToDate)}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid overflow-hidden rounded-xl border sm:grid-cols-4">
              <div className="border-b p-4 sm:border-b-0 sm:border-r">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Present
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {attendance.presentDays}
                </div>
              </div>

              <div className="border-b p-4 sm:border-b-0 sm:border-r">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Absent
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {attendance.absentDays}
                </div>
              </div>

              <div className="border-b p-4 sm:border-b-0 sm:border-r">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Working Days
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {attendance.totalDays}
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Attendance %
                </div>

                <div className="mt-2 text-2xl font-bold">
                  {attendance.percentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </section>

          {/* FINAL RESULT */}

          <section className="mt-8">
            <div className="rounded-2xl border bg-muted/30 p-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Final Academic Result
              </div>

              <div
                className={
                  isPass
                    ? "mt-3 text-4xl font-black tracking-wide text-green-600"
                    : "mt-3 text-4xl font-black tracking-wide text-destructive"
                }
              >
                {data.summary.status}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                The student obtained{" "}
                <span className="font-semibold text-foreground">
                  {data.summary.totalObtained} out of{" "}
                  {data.summary.totalMaxMarks}
                </span>{" "}
                marks with an overall percentage of{" "}
                <span className="font-semibold text-foreground">
                  {data.summary.percentage.toFixed(2)}%
                </span>
                .
              </p>
            </div>
          </section>

          {/* SIGNATURES */}

          <section className="mt-16 grid grid-cols-2 gap-10 text-center">
            <div>
              <div className="mx-auto mb-3 h-px w-full max-w-[180px] bg-border" />

              <div className="text-sm font-semibold">Class Teacher</div>

              <div className="mt-1 text-xs text-muted-foreground">
                Signature
              </div>
            </div>

            <div>
              <div className="mx-auto mb-3 h-px w-full max-w-[180px] bg-border" />

              <div className="text-sm font-semibold">Principal</div>

              <div className="mt-1 text-xs text-muted-foreground">
                Signature & Seal
              </div>
            </div>
          </section>

          {/* FOOTER */}

          <div className="mt-12 border-t pt-5 text-center text-xs text-muted-foreground">
            This is a computer-generated academic progress report. Attendance is
            calculated only up to the examination date.
          </div>
        </div>
      </div>
    </div>
  );
}
