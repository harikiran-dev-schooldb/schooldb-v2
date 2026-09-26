import { Award, Sparkles, Trophy } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default async function StudentResultsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const results = enrollment
    ? await studentExamService.listResults(membership.schoolId, enrollment)
    : [];

  return (
    <SelfServicePage title="Results" description="Marks from completed examinations for the active enrollment.">
      {results.length ? (
        <>
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#17102d] via-[#241449] to-[#38216b] p-6 text-white shadow-[0_26px_70px_rgba(46,16,101,0.22)] sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200"><Sparkles className="size-4" />Academic progress</p>
                <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">Your results, at a glance</h3>
                <p className="mt-2 text-sm text-violet-100/75">{results.length} completed examination{results.length === 1 ? "" : "s"} in your active academic year.</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-xl">
                <Award className="size-5 text-amber-300" />
                <div><p className="text-xs text-violet-100/70">Latest percentage</p><p className="text-2xl font-black">{results[0].percentage}%</p></div>
              </div>
            </div>
          </section>
          {results.map((result) => (
          <Card key={result.id} className="rounded-[26px] border-border/60 bg-card/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{result.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(result.startDate)} – {formatDate(result.endDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{result.percentage}%</p>
                  <Badge variant={resultVariant[result.status]} className="mt-2">
                    {result.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam date</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Pass mark</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-semibold">{subject.subject.name}</TableCell>
                      <TableCell>{formatDate(subject.examDate)}</TableCell>
                      <TableCell>
                        {subject.marksObtained === null ? "—" : `${subject.marksObtained} / ${subject.maxMarks}`}
                      </TableCell>
                      <TableCell>{subject.passMarks ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={resultVariant[subject.status]}>{subject.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                        {subject.remarks || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t border-border/60 px-5 py-4 text-sm font-semibold">
                Total: {result.obtained} / {result.maximum}
              </div>
            </CardContent>
          </Card>
          ))}
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={Trophy}
              title="No completed results"
              description="Results will appear after an exam is completed."
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}
