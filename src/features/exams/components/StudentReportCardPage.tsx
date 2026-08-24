"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  Printer,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

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

function getClassName(subjects: SubjectResult[]) {
  return subjects[0]?.class.name || "—";
}

function getSectionName(subjects: SubjectResult[]) {
  return subjects[0]?.section?.name || "—";
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
      setLoading(true);

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
    const timer = window.setTimeout(() => {
      void loadReportCard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadReportCard]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full border bg-background">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>

        <div className="text-center">
          <p className="font-semibold">Preparing report card...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compiling academic records
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <XCircle className="mx-auto size-12 text-muted-foreground" />

          <h2 className="mt-4 text-xl font-bold">Report Card Not Found</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Unable to load the student&apos;s report card.
          </p>

          <Button
            className="mt-5"
            onClick={() =>
              router.push(`/${schoolSlug}/exams/${examId}/results/${studentId}`)
            }
          >
            Back to Result
          </Button>
        </div>
      </div>
    );
  }

  const attendance = data.summary.attendance;

  const className = getClassName(data.subjects);
  const sectionName = getSectionName(data.subjects);

  const isPass = data.summary.status === "PASS";

  return (
    <div className="min-h-screen bg-muted/30 px-3 py-6 md:px-6 print:bg-white print:p-0">
      {/* ================================================================ */}
      {/* ACTION BAR                                                        */}
      {/* ================================================================ */}

      <div className="mx-auto mb-6 flex max-w-[1000px] flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/${schoolSlug}/exams/${examId}/results/${studentId}`)
          }
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Result
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadReportCard()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>

          <Button onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print Report Card
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* REPORT CARD                                                       */}
      {/* ================================================================ */}

      <main
        className="
    report-card-print
    mx-auto
    max-w-[1000px]
    bg-white
    shadow-sm
    ring-1
    ring-border
    print:max-w-none
    print:shadow-none
    print:ring-0
  "
      >
        {/* ============================================================ */}
        {/* SCHOOL HEADER                                                 */}
        {/* ============================================================ */}

        <header className="border-b-2 border-primary px-6 py-7 md:px-10 print:border-black print:px-8 print:py-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {/* Logo */}

            {data.school.logo ? (
              <div className="flex size-20 shrink-0 items-center justify-center">
                <Image
                  src={data.school.logo}
                  alt={`${data.school.name} logo`}
                  width={80}
                  height={80}
                  className="size-20 object-contain"
                />
              </div>
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center border-2 border-primary text-3xl font-bold text-primary print:border-black print:text-black">
                {data.school.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* School Information */}

            <div className="flex-1">
              <div className="flex items-center gap-2 sm:justify-start">
                <Award className="hidden size-5 text-primary sm:block print:hidden" />

                <h1 className="text-2xl font-bold uppercase tracking-tight md:text-3xl print:text-2xl">
                  {data.school.name}
                </h1>
              </div>

              <div className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground print:text-black">
                Academic Report Card
              </div>

              <div className="mt-4 border-t pt-3 print:border-black">
                <h2 className="text-lg font-bold">{data.exam.name}</h2>

                <p className="mt-1 text-sm text-muted-foreground print:text-black">
                  Academic Year:{" "}
                  <span className="font-semibold text-foreground">
                    {data.exam.academicYear.name}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* STUDENT INFORMATION                                           */}
        {/* ============================================================ */}

        <section className="px-6 py-6 md:px-10 print:px-8 print:py-5">
          <SectionHeading
            icon={<UserRound className="size-4" />}
            title="Student Information"
          />

          <div className="grid border border-border sm:grid-cols-2 print:border-black">
            <InfoCell
              label="Student Name"
              value={data.student.fullName || "Unnamed Student"}
            />

            <InfoCell
              label="Admission Number"
              value={data.student.admissionNo}
              borderLeft
            />

            <InfoCell label="Class" value={className} borderTop />

            <InfoCell
              label="Section"
              value={sectionName}
              borderLeft
              borderTop
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* EXAM INFORMATION                                              */}
        {/* ============================================================ */}

        <section className="px-6 pb-6 md:px-10 print:px-8 print:pb-5">
          <SectionHeading
            icon={<CalendarDays className="size-4" />}
            title="Examination Details"
          />

          <div className="grid border border-border sm:grid-cols-3 print:border-black">
            <InfoCell label="Examination" value={data.exam.name} />

            <InfoCell
              label="Start Date"
              value={formatDate(data.exam.startDate)}
              borderLeft
            />

            <InfoCell
              label="End Date"
              value={formatDate(data.exam.endDate)}
              borderLeft
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* RESULT SUMMARY                                                */}
        {/* ============================================================ */}

        <section className="px-6 pb-6 md:px-10 print:px-8 print:pb-5">
          <SectionHeading
            icon={<CheckCircle2 className="size-4" />}
            title="Result Summary"
          />

          <div className="grid border border-border sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 print:border-black">
            <SummaryCell
              label="Total Marks"
              value={`${data.summary.totalObtained} / ${data.summary.totalMaxMarks}`}
            />

            <SummaryCell
              label="Percentage"
              value={`${data.summary.percentage.toFixed(2)}%`}
              borderLeft
            />

            <SummaryCell
              label="Subjects Passed"
              value={`${data.summary.passedSubjects} / ${data.summary.totalSubjects}`}
              borderLeft
            />

            <SummaryCell
              label="Attendance"
              value={`${attendance.percentage.toFixed(2)}%`}
              borderLeft
            />

            <div
              className={`border-t p-4 text-center sm:border-t-0 lg:border-l print:border-black ${
                isPass
                  ? "bg-emerald-50 print:bg-white"
                  : "bg-red-50 print:bg-white"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black">
                Final Result
              </div>

              <div
                className={`mt-2 flex items-center justify-center gap-2 text-xl font-bold ${
                  isPass
                    ? "text-emerald-700 print:text-black"
                    : "text-red-700 print:text-black"
                }`}
              >
                {isPass ? (
                  <CheckCircle2 className="size-5 print:hidden" />
                ) : (
                  <XCircle className="size-5 print:hidden" />
                )}

                {data.summary.status}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCHOLASTIC PERFORMANCE                                         */}
        {/* ============================================================ */}

        <section className="px-6 pb-7 md:px-10 print:px-8 print:pb-6">
          <SectionHeading
            icon={<BookOpen className="size-4" />}
            title="Scholastic Performance"
          />

          <div className="overflow-hidden border border-border print:border-black">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 print:bg-white">
                  <th className="w-12 border-b px-3 py-3 text-center text-xs font-bold print:border-black">
                    S.No
                  </th>

                  <th className="border-b px-4 py-3 text-left text-xs font-bold print:border-black">
                    Subject
                  </th>

                  <th className="border-b px-3 py-3 text-center text-xs font-bold print:border-black">
                    Max
                  </th>

                  <th className="border-b px-3 py-3 text-center text-xs font-bold print:border-black">
                    Pass
                  </th>

                  <th className="border-b px-3 py-3 text-center text-xs font-bold print:border-black">
                    Obtained
                  </th>

                  <th className="border-b px-3 py-3 text-center text-xs font-bold print:border-black">
                    Result
                  </th>

                  <th className="border-b px-4 py-3 text-left text-xs font-bold print:border-black">
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.subjects.map((subject, index) => (
                  <tr
                    key={subject.scheduleId}
                    className="print:break-inside-avoid"
                  >
                    <td className="border-b px-3 py-3 text-center text-muted-foreground print:border-black print:text-black">
                      {index + 1}
                    </td>

                    <td className="border-b px-4 py-3 print:border-black">
                      <div className="font-semibold">
                        {subject.subject.name}
                      </div>

                      {subject.subject.code && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground print:text-black">
                          {subject.subject.code}
                        </div>
                      )}
                    </td>

                    <td className="border-b px-3 py-3 text-center print:border-black">
                      {subject.maxMarks}
                    </td>

                    <td className="border-b px-3 py-3 text-center print:border-black">
                      {subject.passMarks ?? "—"}
                    </td>

                    <td className="border-b px-3 py-3 text-center font-semibold print:border-black">
                      {subject.resultStatus === "ABSENT"
                        ? "ABSENT"
                        : (subject.marksObtained ?? "—")}
                    </td>

                    <td className="border-b px-3 py-3 text-center print:border-black">
                      <ResultStatus status={subject.resultStatus} />
                    </td>

                    <td className="border-b px-4 py-3 text-muted-foreground print:border-black print:text-black">
                      {subject.remarks || "—"}
                    </td>
                  </tr>
                ))}

                {/* TOTAL */}

                <tr className="bg-muted/40 font-bold print:bg-white">
                  <td
                    colSpan={2}
                    className="border-t-2 px-4 py-3 text-right text-xs uppercase print:border-black"
                  >
                    Total
                  </td>

                  <td className="border-t-2 px-3 py-3 text-center print:border-black">
                    {data.summary.totalMaxMarks}
                  </td>

                  <td className="border-t-2 px-3 py-3 text-center print:border-black">
                    —
                  </td>

                  <td className="border-t-2 px-3 py-3 text-center text-base print:border-black">
                    {data.summary.totalObtained}
                  </td>

                  <td className="border-t-2 px-3 py-3 text-center print:border-black">
                    {data.summary.percentage.toFixed(2)}%
                  </td>

                  <td className="border-t-2 px-4 py-3 print:border-black">
                    {data.summary.status}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================================================ */}
        {/* ATTENDANCE                                                    */}
        {/* ============================================================ */}

        <section className="px-6 pb-7 md:px-10 print:px-8 print:pb-6">
          <SectionHeading
            icon={<CalendarDays className="size-4" />}
            title="Attendance Summary"
          />

          <div className="grid border border-border sm:grid-cols-4 print:border-black">
            <AttendanceCell label="Present" value={attendance.presentDays} />

            <AttendanceCell
              label="Absent"
              value={attendance.absentDays}
              borderLeft
            />

            <AttendanceCell
              label="Working Days"
              value={attendance.totalDays}
              borderLeft
            />

            <AttendanceCell
              label="Attendance"
              value={`${attendance.percentage.toFixed(2)}%`}
              borderLeft
            />
          </div>

          <p className="mt-2 text-right text-[10px] text-muted-foreground print:text-black">
            Attendance calculated up to {formatDate(attendance.upToDate)}
          </p>
        </section>

        {/* ============================================================ */}
        {/* FINAL RESULT                                                 */}
        {/* ============================================================ */}

        <section className="final-result px-6 pb-8 md:px-10 print:px-8 print:pb-7">
          <div className="border-2 border-primary p-6 text-center print:border-black">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground print:text-black">
              Final Academic Result
            </div>

            <div
              className={`result-text mt-2 text-4xl font-black ${
                isPass
                  ? "text-emerald-700 print:text-black"
                  : "text-red-700 print:text-black"
              }`}
            >
              {data.summary.status}
            </div>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground print:text-black">
              The student obtained{" "}
              <strong className="text-foreground print:text-black">
                {data.summary.totalObtained}
              </strong>{" "}
              out of{" "}
              <strong className="text-foreground print:text-black">
                {data.summary.totalMaxMarks}
              </strong>{" "}
              marks with an overall percentage of{" "}
              <strong className="text-foreground print:text-black">
                {data.summary.percentage.toFixed(2)}%
              </strong>
              .
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SIGNATURES                                                    */}
        {/* ============================================================ */}

        <section className="signatures grid grid-cols-2 gap-10 px-6 pb-8 pt-6 md:px-10 print:px-8">
          <SignatureBlock title="Class Teacher" />

          <SignatureBlock title="Principal" />
        </section>

        {/* ============================================================ */}
        {/* FOOTER                                                        */}
        {/* ============================================================ */}

        <footer className="border-t px-6 py-5 text-center md:px-10 print:border-black print:px-8">
          <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-black">
            <FileSignature className="size-3.5 print:hidden" />
            Official Academic Report Card
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground print:text-black">
            This is a computer-generated report card and does not require
            authentication unless signed and stamped by the school.
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ========================================================================== */
/* SECTION HEADING                                                            */
/* ========================================================================== */

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b pb-2 print:border-black">
      <span className="text-primary print:hidden">{icon}</span>

      <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
    </div>
  );
}

/* ========================================================================== */
/* INFO CELL                                                                  */
/* ========================================================================== */

function InfoCell({
  label,
  value,
  borderLeft = false,
  borderTop = false,
}: {
  label: string;
  value: string;
  borderLeft?: boolean;
  borderTop?: boolean;
}) {
  return (
    <div
      className={[
        "p-4",
        borderLeft ? "sm:border-l print:border-black" : "",
        borderTop ? "border-t print:border-black" : "",
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-black">
        {label}
      </div>

      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

/* ========================================================================== */
/* SUMMARY CELL                                                               */
/* ========================================================================== */

function SummaryCell({
  label,
  value,
  borderLeft = false,
}: {
  label: string;
  value: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      className={`border-t p-4 text-center first:border-t-0 sm:border-t-0 print:border-black ${
        borderLeft ? "lg:border-l print:border-black" : ""
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-black">
        {label}
      </div>

      <div className="mt-2 text-lg font-bold">{value}</div>
    </div>
  );
}

/* ========================================================================== */
/* ATTENDANCE CELL                                                            */
/* ========================================================================== */

function AttendanceCell({
  label,
  value,
  borderLeft = false,
}: {
  label: string;
  value: string | number;
  borderLeft?: boolean;
}) {
  return (
    <div
      className={`p-4 text-center ${
        borderLeft ? "sm:border-l print:border-black" : ""
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-black">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

/* ========================================================================== */
/* RESULT STATUS                                                              */
/* ========================================================================== */

function ResultStatus({ status }: { status: "PASS" | "FAIL" | "ABSENT" }) {
  if (status === "PASS") {
    return (
      <span className="font-semibold text-emerald-700 print:text-black">
        PASS
      </span>
    );
  }

  if (status === "ABSENT") {
    return (
      <span className="font-semibold text-amber-700 print:text-black">
        ABSENT
      </span>
    );
  }

  return (
    <span className="font-semibold text-red-700 print:text-black">FAIL</span>
  );
}

/* ========================================================================== */
/* SIGNATURE                                                                  */
/* ========================================================================== */

function SignatureBlock({ title }: { title: string }) {
  return (
    <div className="pt-8 text-center">
      <div className="mx-auto h-px max-w-[220px] bg-foreground print:bg-black" />

      <div className="mt-2 text-sm font-semibold">{title}</div>

      <div className="mt-1 text-[10px] text-muted-foreground print:text-black">
        Signature & Seal
      </div>
    </div>
  );
}
