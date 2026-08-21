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
  FileSignature,
  Award,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

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
        { cache: "no-store" },
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
          <RefreshCw className="size-8 animate-spin text-teal-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800">
            Preparing report card...
          </p>
          <p className="text-sm text-slate-500">Compiling academic records</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-3xl glass-panel p-10 text-center">
          <XCircle className="size-12 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-800">
            Report card not found
          </h2>
          <p className="max-w-xs text-sm text-slate-500">
            Unable to load the student&apos;s report card.
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
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 print:bg-white print:p-0">
      {/* ACTION BAR */}
      <div className="mx-auto mb-6 flex max-w-5xl flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          className="w-fit text-slate-600 hover:bg-white hover:text-slate-900"
          onClick={() =>
            router.push(`/${schoolSlug}/exams/${examId}/results/${studentId}`)
          }
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Result
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void loadReportCard()}
            className="bg-white/60 backdrop-blur-sm"
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            onClick={() => window.print()}
            className="shadow-lg shadow-teal-500/20"
          >
            <Printer className="mr-2 size-4" />
            Print Report Card
          </Button>
        </div>
      </div>

      {/* REPORT CARD CONTAINER */}
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200/60 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
        {/* SCHOOL HEADER */}
        <div className="relative border-b border-slate-100 bg-slate-50/50 px-6 py-8 md:px-12 print:border-b-2 print:border-black print:bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] print:hidden" />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            {data.school.logo ? (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 print:rounded-none print:ring-0">
                <Image
                  width={80}
                  height={80}
                  src={data.school.logo}
                  alt={`${data.school.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-4xl font-black text-teal-700 shadow-sm ring-1 ring-teal-100 print:rounded-none print:ring-0 print:border">
                {data.school.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl print:text-black">
                {data.school.name}
              </h1>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-200/50 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase print:bg-transparent print:p-0">
                <Award className="size-3.5 print:hidden" />
                Academic Progress Report
              </div>
              <div className="mt-4">
                <h2 className="text-xl font-bold text-slate-800 print:text-black">
                  {data.exam.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500 print:text-black">
                  Academic Year:{" "}
                  <span className="font-bold text-slate-700 print:text-black">
                    {data.exam.academicYear.name}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RESULT STATUS RIBBON */}
        <div
          className={`border-b px-6 py-5 md:px-12 print:border-y-2 print:border-black print:bg-transparent ${isPass ? "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-100" : "bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-100"}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex size-12 items-center justify-center rounded-xl print:hidden ${isPass ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
              >
                {isPass ? (
                  <CheckCircle2 className="size-7" />
                ) : (
                  <XCircle className="size-7" />
                )}
              </div>
              <div>
                <div
                  className={`text-[10px] font-bold tracking-[0.2em] uppercase print:text-black ${isPass ? "text-emerald-700/70" : "text-red-700/70"}`}
                >
                  Overall Result
                </div>
                <div
                  className={`text-3xl font-black tracking-tight print:text-black ${isPass ? "text-emerald-700" : "text-red-700"}`}
                >
                  {data.summary.status}
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase print:text-black">
                Overall Percentage
              </div>
              <div className="text-3xl font-black tracking-tight text-slate-900 print:text-black">
                {data.summary.percentage.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12">
          {/* STUDENT INFORMATION */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="size-5 text-teal-600 print:hidden" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900 print:text-black">
                Student Information
              </h2>
            </div>
            <div className="grid overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/30 sm:grid-cols-2 print:rounded-none print:border-black print:bg-transparent">
              <div className="border-b border-slate-200/70 p-5 sm:border-r print:border-black">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Student Name
                </div>
                <div className="mt-1.5 text-lg font-bold text-slate-900 print:text-black">
                  {data.student.fullName || "Unnamed Student"}
                </div>
              </div>
              <div className="border-b border-slate-200/70 p-5 print:border-black">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Admission Number
                </div>
                <div className="mt-1.5 text-lg font-bold text-slate-900 print:text-black">
                  {data.student.admissionNo}
                </div>
              </div>
              <div className="border-b border-slate-200/70 p-5 sm:border-b-0 sm:border-r print:border-black">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Class
                </div>
                <div className="mt-1.5 text-lg font-bold text-slate-900 print:text-black">
                  {className}
                </div>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Section
                </div>
                <div className="mt-1.5 text-lg font-bold text-slate-900 print:text-black">
                  {sectionName}
                </div>
              </div>
            </div>
          </section>

          {/* PERFORMANCE SUMMARY */}
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900 print:text-black">
              Performance Summary
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm print:rounded-none print:border-black print:shadow-none">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Total Marks
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 print:text-black">
                  {data.summary.totalObtained}
                  <span className="text-base font-medium text-slate-400 print:text-black">
                    {" "}
                    / {data.summary.totalMaxMarks}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm print:rounded-none print:border-black print:shadow-none">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Percentage
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 print:text-black">
                  {data.summary.percentage.toFixed(2)}%
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm print:rounded-none print:border-black print:shadow-none">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Subjects Passed
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 print:text-black">
                  {data.summary.passedSubjects}
                  <span className="text-base font-medium text-slate-400 print:text-black">
                    {" "}
                    / {data.summary.totalSubjects}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm print:rounded-none print:border-black print:shadow-none">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Attendance
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 print:text-black">
                  {attendance.percentage.toFixed(2)}%
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-400 print:text-black">
                  {attendance.presentDays} / {attendance.totalDays} days
                </div>
              </div>
            </div>
          </section>

          {/* SCHOLASTIC PERFORMANCE */}
          <section className="mt-12">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-teal-600 print:hidden" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 print:text-black">
                    Scholastic Performance
                  </h2>
                  <p className="text-sm text-slate-500 print:text-black">
                    Subject-wise examination performance
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-wide text-slate-600 print:bg-transparent print:p-0 print:text-black">
                {data.summary.totalSubjects} Subjects
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 print:rounded-none print:border-black">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/80 print:border-black print:bg-transparent">
                    <th className="w-14 px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      S.No
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Subject
                    </th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Max
                    </th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Pass
                    </th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Obtained
                    </th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Result
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-black">
                  {data.subjects.map((subject, index) => (
                    <tr
                      key={subject.scheduleId}
                      className="group transition-colors hover:bg-slate-50/50 print:hover:bg-transparent"
                    >
                      <td className="px-5 py-4 text-center font-medium text-slate-400 print:text-black">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 print:text-black">
                          {subject.subject.name}
                        </div>
                        {subject.subject.code && (
                          <div className="mt-0.5 text-[11px] font-medium text-slate-400 print:text-black">
                            {subject.subject.code}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-slate-600 print:text-black">
                        {subject.maxMarks}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-slate-600 print:text-black">
                        {subject.passMarks ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-slate-900 print:text-black">
                        {subject.resultStatus === "ABSENT"
                          ? "ABSENT"
                          : (subject.marksObtained ?? "—")}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase print:border print:border-black print:text-black print:bg-transparent ${
                            subject.resultStatus === "PASS"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : subject.resultStatus === "ABSENT"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                                : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                          }`}
                        >
                          {subject.resultStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-500 print:text-black">
                        {subject.remarks || "—"}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-50/80 print:bg-transparent print:border-t-2 print:border-black">
                    <td
                      colSpan={2}
                      className="px-5 py-5 text-right text-[11px] font-bold tracking-[0.15em] text-slate-700 uppercase print:text-black"
                    >
                      TOTAL
                    </td>
                    <td className="px-5 py-5 text-center font-black text-slate-900 print:text-black">
                      {data.summary.totalMaxMarks}
                    </td>
                    <td className="px-5 py-5 text-center text-slate-400 print:text-black">
                      —
                    </td>
                    <td className="px-5 py-5 text-center text-lg font-black text-slate-900 print:text-black">
                      {data.summary.totalObtained}
                    </td>
                    <td className="px-5 py-5 text-center text-lg font-black text-slate-900 print:text-black">
                      {data.summary.percentage.toFixed(2)}%
                    </td>
                    <td className="px-5 py-5 text-left font-black text-slate-900 print:text-black">
                      {data.summary.status}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ATTENDANCE */}
          <section className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="size-5 text-teal-600 print:hidden" />
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 print:text-black">
                  Attendance Summary
                </h2>
                <p className="text-sm text-slate-500 print:text-black">
                  Attendance calculated up to{" "}
                  <span className="font-bold text-slate-700 print:text-black">
                    {formatDate(attendance.upToDate)}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/30 sm:grid-cols-4 print:rounded-none print:border-black print:bg-transparent">
              <div className="border-b border-slate-200/70 p-5 sm:border-b-0 sm:border-r print:border-black">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Present
                </div>
                <div className="mt-1.5 text-2xl font-black text-emerald-600 print:text-black">
                  {attendance.presentDays}
                </div>
              </div>
              <div className="border-b border-slate-200/70 p-5 sm:border-b-0 sm:border-r print:border-black">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Absent
                </div>
                <div className="mt-1.5 text-2xl font-black text-red-500 print:text-black">
                  {attendance.absentDays}
                </div>
              </div>
              <div className="border-b border-slate-200/70 p-5 sm:border-b-0 sm:border-r print:border-black">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Working Days
                </div>
                <div className="mt-1.5 text-2xl font-black text-slate-900 print:text-black">
                  {attendance.totalDays}
                </div>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                  Attendance %
                </div>
                <div className="mt-1.5 text-2xl font-black text-slate-900 print:text-black">
                  {attendance.percentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </section>

          {/* FINAL RESULT */}
          <section className="mt-12 page-break-inside-avoid">
            <div className="rounded-3xl border border-slate-200/60 bg-gradient-to-b from-slate-50/80 to-white p-8 text-center shadow-sm print:rounded-none print:border-2 print:border-black print:bg-none">
              <div className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase print:text-black">
                Final Academic Result
              </div>
              <div
                className={`mt-3 text-5xl font-black tracking-tight print:text-black ${isPass ? "text-emerald-600" : "text-red-600"}`}
              >
                {data.summary.status}
              </div>
              <p className="mt-4 text-base leading-relaxed text-slate-600 print:text-black">
                The student obtained{" "}
                <span className="font-bold text-slate-900 print:text-black">
                  {data.summary.totalObtained} out of{" "}
                  {data.summary.totalMaxMarks}
                </span>{" "}
                marks with an overall percentage of{" "}
                <span className="font-bold text-slate-900 print:text-black">
                  {data.summary.percentage.toFixed(2)}%
                </span>
                .
              </p>
            </div>
          </section>

          {/* SIGNATURES */}
          <section className="mt-20 grid grid-cols-2 gap-12 text-center page-break-inside-avoid">
            <div>
              <div className="mx-auto mb-3 h-px w-full max-w-[220px] bg-slate-300 print:bg-black" />
              <div className="text-sm font-bold text-slate-800 print:text-black">
                Class Teacher
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-400 print:text-black">
                Signature
              </div>
            </div>
            <div>
              <div className="mx-auto mb-3 h-px w-full max-w-[220px] bg-slate-300 print:bg-black" />
              <div className="text-sm font-bold text-slate-800 print:text-black">
                Principal
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-400 print:text-black">
                Signature & Seal
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <div className="mt-16 border-t border-slate-100 pt-6 text-center print:border-black">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase print:text-black">
              <FileSignature className="size-3.5 print:hidden" />
              Official Academic Transcript
            </div>
            <p className="mt-2 text-xs text-slate-400 print:text-black">
              This is a computer-generated academic progress report. Attendance
              is calculated only up to the examination date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
