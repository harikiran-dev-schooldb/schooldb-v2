import Link from "next/link";
import { ArrowLeft, Award, CalendarDays, GraduationCap, ScrollText } from "lucide-react";

import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { PrintReportButton } from "@/components/self-service/PrintReportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StudentYearlyPerformance } from "@/features/exams/services/student-yearly-performance.service";

type Props = {
  data: StudentYearlyPerformance;
  logoUrl: string | null;
  backHref: string;
  showYearPicker?: boolean;
};

const statusVariant = {
  PASS: "success",
  FAIL: "destructive",
  PENDING: "warning",
  ABSENT: "destructive",
  EXEMPTED: "outline",
} as const;

function formatMarks(result: StudentYearlyPerformance["subjects"][number]["results"][number] | undefined) {
  if (!result || result.status === "PENDING") return "—";
  if (result.status === "ABSENT") return "AB";
  if (result.status === "EXEMPTED") return "EX";
  if (result.assessmentType === "GRADE") return result.grade || "—";
  return `${result.marksObtained ?? 0}/${result.maxMarks}`;
}

export function StudentYearlyPerformanceReport({
  data,
  logoUrl,
  backHref,
  showYearPicker = true,
}: Props) {
  const { student, enrollment, academicYears, exams, subjects, attendance, summary } = data;

  return (
    <div className="min-h-screen bg-muted/30 px-3 py-6 print:bg-white print:p-0 md:px-6">
      <div className="mx-auto mb-5 flex max-w-6xl flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <Button asChild variant="outline">
          <Link href={backHref}><ArrowLeft className="size-4" />Back to student</Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {showYearPicker && academicYears.length > 1 ? (
            <form method="get" className="flex items-end gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Academic year</span>
                <select
                  name="academicYearId"
                  defaultValue={enrollment?.academicYearId}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                </select>
              </label>
              <Button type="submit" variant="secondary">View</Button>
            </form>
          ) : null}
          <PrintReportButton label="Print / Save PDF" />
        </div>
      </div>

      {!enrollment || !summary || exams.length === 0 ? (
        <Card className="mx-auto max-w-3xl">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <ScrollText className="size-10 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-bold">No yearly performance available</h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              The yearly report appears after at least one examination result is completed and published for this academic year.
            </p>
          </CardContent>
        </Card>
      ) : (
        <article className="yearly-performance-print theme-force-light mx-auto max-w-6xl overflow-hidden rounded-[28px] border bg-white text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.09)] print:rounded-none print:border-black print:shadow-none">
          <header className="border-b border-indigo-100 bg-gradient-to-br from-white via-indigo-50/80 to-violet-100/70 px-6 py-7 print:border-b-2 print:border-black print:bg-white sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <SchoolLogo src={logoUrl} schoolName={student.school.name} className="size-16 rounded-2xl print:ring-1 print:ring-black" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 print:text-black">Annual academic performance</p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{student.school.name}</h1>
                  <p className="mt-1 text-sm text-slate-600">Academic year {enrollment.academicYear.name}</p>
                </div>
              </div>
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-2xl font-black text-white print:border-2 print:border-black print:bg-white print:text-black">
                {summary.grade}
              </div>
            </div>
          </header>

          <section className="grid gap-4 border-b bg-slate-50/70 px-6 py-5 print:bg-white sm:grid-cols-4 sm:px-10">
            <Info label="Student" value={student.fullName || "Student"} />
            <Info label="Admission no." value={student.admissionNo} />
            <Info label="Class & section" value={`${enrollment.class.name} – ${enrollment.section.name}`} />
            <Info label="Roll no." value={enrollment.rollNo?.toString() || "—"} />
          </section>

          <section className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4 sm:px-10">
            <Summary icon={Award} label="Annual average" value={summary.percentage === null ? "—" : `${summary.percentage.toFixed(2)}%`} />
            <Summary icon={ScrollText} label="Aggregate marks" value={`${summary.obtained} / ${summary.maximum}`} />
            <Summary icon={CalendarDays} label="Attendance" value={attendance ? `${attendance.attendancePercentage.toFixed(2)}%` : "—"} />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 print:border-black">
              <GraduationCap className="size-4 text-indigo-600 print:text-black" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Final result</p>
              <Badge variant={statusVariant[summary.status]} className="mt-2 text-sm">{summary.status}</Badge>
              <p className="mt-2 text-xs text-slate-500">{summary.passedSubjects} passed · {summary.failedSubjects} need support</p>
            </div>
          </section>

          <section className="px-6 pb-7 sm:px-10">
            <div className="mb-3">
              <h2 className="font-bold">Subject-wise yearly performance</h2>
              <p className="mt-1 text-xs text-slate-500">Only completed and published examination results are included.</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 print:overflow-visible print:rounded-none print:border-black">
              <table className="w-full min-w-[800px] border-collapse text-sm print:min-w-0 print:text-[10px]">
                <thead className="bg-slate-50 print:bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Subject</th>
                    {exams.map((exam) => <th key={exam.id} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider">{exam.name}</th>)}
                    <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Year avg.</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-t border-slate-200 print:border-black">
                      <td className="px-4 py-3 font-semibold">{subject.name}</td>
                      {exams.map((exam) => (
                        <td key={exam.id} className="px-3 py-3 text-center font-medium">
                          {formatMarks(subject.results.find((result) => result.examId === exam.id))}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold">{subject.percentage === null ? subject.grade : `${subject.percentage.toFixed(2)}%`}</td>
                      <td className="px-4 py-3 text-center"><Badge variant={statusVariant[subject.status]}>{subject.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mx-6 mb-8 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm text-slate-700 print:border print:border-black print:bg-white sm:mx-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700 print:text-black">Academic observation</p>
            <p className="mt-2 leading-6">{data.observation}</p>
          </section>

          <footer className="grid grid-cols-2 gap-16 border-t border-slate-200 px-10 py-12 text-center text-xs font-semibold text-slate-500 print:border-black">
            <div className="border-t border-slate-400 pt-2">Class teacher</div>
            <div className="border-t border-slate-400 pt-2">Principal</div>
          </footer>
        </article>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1.5 text-sm font-bold">{value}</p></div>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 p-4 print:border-black print:bg-white"><Icon className="size-4 text-indigo-600 print:text-black" /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}
