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
        { cache: "no-store" },
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="size-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="h-32 w-full animate-pulse rounded-3xl bg-slate-200/60" />
        <div className="grid gap-6 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-3xl bg-slate-200/60"
            />
          ))}
        </div>
        <div className="h-40 w-full animate-pulse rounded-3xl bg-slate-200/60" />
        <div className="h-96 w-full animate-pulse rounded-3xl bg-slate-200/60" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="size-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-800">Result Not Found</h2>
        <p className="text-sm text-slate-500">
          We couldn't retrieve the data for this exam result.
        </p>
      </div>
    );
  }

  const attendance = data.summary.attendance;
  const isPass = data.summary.status === "PASS";

  return (
    <div className="space-y-8 p-6 md:p-8 print:space-y-6 print:p-0">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col gap-5 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 bg-white/60 backdrop-blur-sm hover:bg-white"
            onClick={() =>
              router.push(`/${schoolSlug}/exams/${examId}/results`)
            }
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Student Result
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {data.exam.name} <span className="mx-1.5 text-slate-300">•</span>{" "}
              {data.exam.academicYear.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="bg-white/60 backdrop-blur-sm hover:bg-white"
            onClick={() => void loadResult()}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="bg-white/60 backdrop-blur-sm hover:bg-white"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 size-4" />
            Print Result
          </Button>
          <Button
            className="shadow-lg shadow-teal-500/20"
            onClick={() =>
              router.push(
                `/${schoolSlug}/exams/${examId}/results/${studentId}/report-card`,
              )
            }
          >
            <FileText className="mr-2 size-4" />
            View Report Card
          </Button>
        </div>
      </div>

      {/* PRINT ONLY HEADER */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Student Result
        </h1>
        <p className="mt-1 font-medium text-black">
          {data.exam.name} • Academic Year: {data.exam.academicYear.name}
        </p>
      </div>

      {/* 1. STUDENT INFORMATION CARD */}
      <Card className="glass-panel overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40 print:rounded-none print:border-black print:shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 print:border-black print:bg-transparent">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-teal-600 print:hidden" />
            <CardTitle className="text-lg font-bold text-slate-900 print:text-black">
              Student Information
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
              Student Name
            </div>
            <div className="mt-1.5 text-lg font-bold text-slate-900 print:text-black">
              {data.student.fullName || "Unnamed Student"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
              Admission Number
            </div>
            <div className="mt-1.5 text-lg font-bold text-slate-900 print:text-black">
              {data.student.admissionNo}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. RESULT SUMMARY (5-GRID) */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="glass-panel transition-all hover:-translate-y-1 hover:shadow-xl print:rounded-none print:border-black print:shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                Total Marks
              </div>
              <Target className="size-4 text-teal-600 print:hidden" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 print:text-black">
                {data.summary.totalObtained}
              </span>
              <span className="text-sm font-bold text-slate-400 print:text-black">
                / {data.summary.totalMaxMarks}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel transition-all hover:-translate-y-1 hover:shadow-xl print:rounded-none print:border-black print:shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                Percentage
              </div>
              <TrendingUp className="size-4 text-blue-600 print:hidden" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 print:text-black">
                {data.summary.percentage.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-slate-400 print:text-black">
                %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel transition-all hover:-translate-y-1 hover:shadow-xl print:rounded-none print:border-black print:shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                Subjects Passed
              </div>
              <BookOpen className="size-4 text-indigo-600 print:hidden" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 print:text-black">
                {data.summary.passedSubjects}
              </span>
              <span className="text-sm font-bold text-slate-400 print:text-black">
                / {data.summary.totalSubjects}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel transition-all hover:-translate-y-1 hover:shadow-xl print:rounded-none print:border-black print:shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
                Attendance
              </div>
              <CalendarDays className="size-4 text-purple-600 print:hidden" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 print:text-black">
                {attendance.percentage.toFixed(0)}
              </span>
              <span className="text-lg font-bold text-slate-400 print:text-black">
                %
              </span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-400 print:text-black">
              {attendance.presentDays} of {attendance.totalDays} days
            </div>
          </CardContent>
        </Card>

        <Card
          className={`overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl print:rounded-none print:border-black print:bg-transparent print:shadow-none ${isPass ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white" : "bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white"}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-[0.15em] text-white/80 uppercase print:text-black">
                Final Result
              </div>
              {isPass ? (
                <CheckCircle2 className="size-4 text-white/80 print:hidden" />
              ) : (
                <XCircle className="size-4 text-white/80 print:hidden" />
              )}
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-white print:text-black">
              {data.summary.status}
            </div>
            <div className="mt-1 text-[11px] font-medium text-white/80 print:text-black">
              {data.summary.passedSubjects} passed •{" "}
              {data.summary.failedSubjects} failed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. ATTENDANCE SUMMARY CARD */}
      <Card className="glass-panel overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40 print:rounded-none print:border-black print:shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 print:border-black print:bg-transparent">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-teal-600 print:hidden" />
            <CardTitle className="text-lg font-bold text-slate-900 print:text-black">
              Attendance Summary
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
              Present Days
            </div>
            <div className="mt-1.5 text-3xl font-black text-emerald-600 print:text-black">
              {attendance.presentDays}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
              Absent Days
            </div>
            <div className="mt-1.5 text-3xl font-black text-red-500 print:text-black">
              {attendance.absentDays}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
              Total Working Days
            </div>
            <div className="mt-1.5 text-3xl font-black text-slate-900 print:text-black">
              {attendance.totalDays}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase print:text-black">
              Attendance Percentage
            </div>
            <div className="mt-1.5 text-3xl font-black text-slate-900 print:text-black">
              {attendance.percentage.toFixed(2)}%
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-400 print:text-black">
              Up to {formatDate(attendance.upToDate)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. SUBJECT RESULTS TABLE */}
      <Card className="glass-panel overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40 print:rounded-none print:border-black print:shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 print:border-black print:bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart className="size-5 text-teal-600 print:hidden" />
              <CardTitle className="text-lg font-bold text-slate-900 print:text-black">
                Subject-wise Results
              </CardTitle>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-wide text-slate-600 shadow-sm print:hidden">
              {data.subjects.length} Subjects
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {data.subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                No subject results recorded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 print:border-black print:bg-transparent">
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Subject
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Class
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Section
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Exam Date
                    </th>
                    <th className="px-5 py-4 text-right text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Max Marks
                    </th>
                    <th className="px-5 py-4 text-right text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Pass Marks
                    </th>
                    <th className="px-5 py-4 text-right text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Obtained
                    </th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Status
                    </th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Result
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase print:text-black">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 print:divide-black">
                  {data.subjects.map((subject) => (
                    <tr
                      key={subject.scheduleId}
                      className="group transition-colors hover:bg-slate-50/60 print:hover:bg-transparent"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors print:text-black">
                          {subject.subject.name}
                        </div>
                        {subject.subject.code && (
                          <div className="mt-0.5 text-[11px] font-medium text-slate-400 print:text-black">
                            ({subject.subject.code})
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700 print:text-black">
                        {subject.class.name}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700 print:text-black">
                        {subject.section?.name || "All"}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-500 print:text-black">
                        {formatDate(subject.examDate)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-600 print:text-black">
                        {subject.maxMarks}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-600 print:text-black">
                        {subject.passMarks ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-base font-bold text-slate-900 print:text-black">
                          {subject.status === "ABSENT"
                            ? "—"
                            : (subject.marksObtained ?? "—")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-slate-600 print:text-black">
                        {subject.status}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase print:border print:border-black print:bg-transparent print:text-black ${
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
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
