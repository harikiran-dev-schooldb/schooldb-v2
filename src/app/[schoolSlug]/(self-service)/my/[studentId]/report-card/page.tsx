import { Award, CalendarDays, GraduationCap, ScrollText } from "lucide-react";

import { PrintReportButton } from "@/components/self-service/PrintReportButton";
import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { studentExamService } from "@/features/exams/services/student-exam.service";
import { formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

const resultVariant = {
  PASS: "success",
  FAIL: "destructive",
  PENDING: "warning",
  ABSENT: "destructive",
  EXEMPTED: "outline",
} as const;

export default async function StudentReportCardPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, student, enrollment } = await requireStudentAccess(schoolSlug, studentId);

  const [results, attendance] = enrollment
    ? await Promise.all([
        studentExamService.listResults(membership.schoolId, enrollment),
        attendanceService.studentAttendanceReport(
          membership.schoolId,
          studentId,
          enrollment.academicYearId,
        ),
      ])
    : [[], null];

  return (
    <SelfServicePage
      title="Report card"
      description="A printable academic summary using completed exam results."
    >
      <div className="flex justify-end">
        <PrintReportButton />
      </div>

      {results.length ? (
        <div className="space-y-8 print:space-y-0">
          {results.map((result) => (
            <article
              key={result.id}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.09)] print:break-after-page print:rounded-none print:border-black print:shadow-none"
            >
              <header className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-violet-700 to-blue-700 px-6 py-8 text-white print:border-b-2 print:border-black print:bg-white print:text-black sm:px-10">
                <div className="absolute -right-12 -top-16 size-48 rounded-full bg-white/10 blur-2xl print:hidden" />
                <div className="relative flex flex-wrap items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 print:border print:border-black print:bg-white">
                      <GraduationCap className="size-7" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-100 print:text-black">
                        Official academic report
                      </p>
                      <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">{membership.school.name}</h2>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold">{result.name}</p>
                    <p className="mt-1 text-sm text-indigo-100 print:text-black">
                      {enrollment?.academicYear.name}
                    </p>
                  </div>
                </div>
              </header>

              <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-5 print:bg-white sm:grid-cols-4 sm:px-10">
                <Info label="Student" value={student.fullName || "Student"} />
                <Info label="Admission no." value={student.admissionNo} />
                <Info label="Class & section" value={enrollment ? `${enrollment.class.name} ${enrollment.section.name}` : "—"} />
                <Info label="Exam dates" value={`${formatDate(result.startDate)} – ${formatDate(result.endDate)}`} />
              </div>

              <div className="grid gap-4 px-6 py-6 sm:grid-cols-4 sm:px-10">
                <Summary icon={Award} label="Percentage" value={`${result.percentage.toFixed(2)}%`} />
                <Summary icon={ScrollText} label="Marks" value={`${result.obtained} / ${result.maximum}`} />
                <Summary
                  icon={CalendarDays}
                  label="Attendance"
                  value={attendance ? `${attendance.summary.attendancePercentage.toFixed(2)}%` : "—"}
                />
                <div className="rounded-2xl border border-slate-200 bg-white p-4 print:border-black">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Final result</p>
                  <Badge variant={resultVariant[result.status]} className="mt-3 text-sm">{result.status}</Badge>
                </div>
              </div>

              <div className="px-6 pb-7 sm:px-10">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 print:rounded-none print:border-black">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 print:bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Subject</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Maximum</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Pass</th>
                        <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Obtained</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.subjects.map((subject) => (
                        <tr key={subject.id} className="border-t border-slate-200 print:border-black">
                          <td className="px-4 py-3 font-semibold">{subject.subject.name}</td>
                          <td className="px-3 py-3 text-center">{subject.maxMarks}</td>
                          <td className="px-3 py-3 text-center">{subject.passMarks ?? "—"}</td>
                          <td className="px-3 py-3 text-center font-bold">{subject.marksObtained ?? "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={resultVariant[subject.status]}>{subject.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="grid grid-cols-2 gap-12 border-t border-slate-200 px-8 py-10 text-center text-xs font-semibold text-slate-500 print:border-black">
                <div className="border-t border-slate-400 pt-2">Class teacher</div>
                <div className="border-t border-slate-400 pt-2">Principal</div>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={ScrollText}
              title="No report card available"
              description="A report card appears after an exam is completed."
              className="min-h-56"
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Award;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 p-4 print:border-black print:bg-white">
      <Icon className="size-4 text-indigo-600 print:text-black" />
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}
