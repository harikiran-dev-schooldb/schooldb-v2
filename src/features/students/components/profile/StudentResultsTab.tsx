"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BookOpenCheck, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = { studentId: string };

type ExamOption = {
  id: string;
  name: string;
  status: string;
  academicYear: { id: string; name: string };
};

type SubjectResult = {
  scheduleId: string;
  subject: { id: string; name: string; code: string | null };
  marksObtained: number | null;
  maxMarks: number;
  passMarks: number | null;
  status: "PENDING" | "PASS" | "FAIL" | "ABSENT" | "EXEMPTED";
  remarks: string | null;
};

type StudentResult = {
  totalObtained: number;
  totalMaxMarks: number;
  subjects: number;
  percentage: number;
  status: "PENDING" | "PASS" | "FAIL";
  subjectResults: SubjectResult[];
};

type ResultsResponse = {
  exams: ExamOption[];
  selectedExamId: string | null;
  result: StudentResult | null;
};

function statusVariant(status: string) {
  return status === "PASS" ? "default" : status === "FAIL" || status === "ABSENT" ? "destructive" : "secondary";
}

export function StudentResultsTab({ studentId }: Props) {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const query = selectedExamId ? `?examId=${encodeURIComponent(selectedExamId)}` : "";
        const response = await fetch(`/api/v1/students/${studentId}/results${query}`, { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || !json.success) {
          setData(null);
          return;
        }
        setData(json.data);
        if (!selectedExamId && json.data?.selectedExamId) setSelectedExamId(json.data.selectedExamId);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load student results:", error);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [studentId, selectedExamId]);

  const selectedExam = useMemo(
    () => data?.exams.find((exam) => exam.id === (data.selectedExamId || selectedExamId)) ?? null,
    [data, selectedExamId],
  );

  if (loading && !data) {
    return <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading results...</div>;
  }

  if (!data || data.exams.length === 0) {
    return <div className="rounded-xl border p-6 text-sm text-muted-foreground">No exams are available for this student.</div>;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Exam Results</p>
            <p className="mt-1 text-sm text-muted-foreground">Select an exam to view this student&apos;s subject-wise marks and overall result.</p>
          </div>
          <div className="w-full sm:w-80">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Exam</p>
            <Select value={selectedExamId || data.selectedExamId || undefined} onValueChange={setSelectedExamId}>
              <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent>
                {data.exams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.name} · {exam.academicYear.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading exam result...</div>
      ) : !data.result ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">No result has been entered for this student in {selectedExam?.name || "the selected exam"}.</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Marks</p><p className="mt-1 text-xl font-semibold">{data.result.totalObtained} / {data.result.totalMaxMarks}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Percentage</p><p className="mt-1 text-xl font-semibold">{data.result.percentage}%</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Subjects</p><p className="mt-1 text-xl font-semibold">{data.result.subjects}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overall Result</p><div className="mt-2"><Badge variant={statusVariant(data.result.status)}>{data.result.status}</Badge></div></CardContent></Card>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b px-5 py-4"><BookOpenCheck className="size-4 text-primary" /><h3 className="font-semibold">Subject Results</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Subject</th><th className="px-5 py-3 text-right">Marks</th><th className="px-5 py-3 text-right">Max</th><th className="px-5 py-3 text-right">Pass</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Remarks</th></tr></thead>
                  <tbody className="divide-y">
                    {data.result.subjectResults.map((subject) => (
                      <tr key={subject.scheduleId}>
                        <td className="px-5 py-3 font-medium">{subject.subject.name}</td>
                        <td className="px-5 py-3 text-right">{subject.status === "ABSENT" ? "AB" : subject.status === "EXEMPTED" ? "EX" : subject.marksObtained ?? "—"}</td>
                        <td className="px-5 py-3 text-right">{subject.maxMarks}</td>
                        <td className="px-5 py-3 text-right">{subject.passMarks ?? "—"}</td>
                        <td className="px-5 py-3"><Badge variant={statusVariant(subject.status)}>{subject.status}</Badge></td>
                        <td className="px-5 py-3 text-muted-foreground">{subject.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground"><Award className="size-4" />{selectedExam?.name} · {selectedExam?.academicYear.name}</div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
