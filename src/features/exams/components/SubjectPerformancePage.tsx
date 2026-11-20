"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenCheck, LoaderCircle, RefreshCw, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { AcademicYearSelect, ClassSelect, SectionSelect } from "@/components/common/select";
import { AcademicBranchSelect } from "@/components/common/select/AcademicBranchSelect";
import { SyllabusSelect } from "@/components/common/select/SyllabusSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ExamOption = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  academicYearId: string;
  academicYear: { id: string; name: string; active: boolean };
};

type SubjectSummary = {
  id: string;
  name: string;
  assessmentType: "MARKS" | "GRADE" | "MIXED";
  maxMarks: number | null;
  passMarks: number | null;
  assessedStudents: number;
  pendingStudents: number;
  passedStudents: number;
  failedStudents: number;
  absentStudents: number;
  exemptedStudents: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
  passRate: number | null;
};

type StudentResult = {
  subjectId: string;
  assessmentType: "MARKS" | "GRADE";
  maxMarks: number;
  passMarks: number | null;
  marksObtained: number | null;
  grade: string | null;
  status: "PENDING" | "PASS" | "FAIL" | "ABSENT" | "EXEMPTED";
  percentage: number | null;
};

type PerformanceData = {
  exam: { id: string; name: string; academicYear: { id: string; name: string } };
  scope: {
    class: { id: string; name: string };
    section: { id: string; name: string } | null;
    restricted: boolean;
  } | null;
  subjects: SubjectSummary[];
  students: Array<{
    studentId: string;
    admissionNo: string;
    fullName: string;
    imageUrl: string | null;
    rollNo: number | null;
    section: { id: string; name: string };
    results: StudentResult[];
  }>;
  totals: {
    students: number;
    totalEntries: number;
    completedEntries: number;
    pendingEntries: number;
    passedEntries: number;
    failedEntries: number;
    passRate: number | null;
  };
};

type Props = { schoolSlug: string };
type Scope = "CLASS" | "SECTION";

export function SubjectPerformancePage({ schoolSlug }: Props) {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [scope, setScope] = useState<Scope>("CLASS");
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/exams", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load examinations.");
        if (!active) return;
        const available = (result.data as ExamOption[]).filter((exam) => exam.status !== "CANCELLED");
        setExams(available);
        const preferred = available.find((exam) => exam.academicYear.active) ?? available[0];
        if (preferred) {
          setAcademicYearId(preferred.academicYearId);
          setExamId(preferred.id);
        }
      })
      .catch((error: unknown) => active && toast.error(error instanceof Error ? error.message : "Unable to load examinations."))
      .finally(() => active && setLoadingExams(false));
    return () => { active = false; };
  }, []);

  const filteredExams = useMemo(
    () => exams.filter((exam) => exam.academicYearId === academicYearId),
    [academicYearId, exams],
  );
  const ready = Boolean(examId && classId && (scope === "CLASS" || sectionId));

  const loadPerformance = useCallback(async () => {
    if (!ready) { setData(null); return; }
    const params = new URLSearchParams({ classId });
    if (scope === "SECTION") params.set("sectionId", sectionId);
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/exams/${encodeURIComponent(examId)}/subject-performance?${params}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load subject performance.");
      setData(result.data);
      setSelectedSubjectId((current) =>
        current === "ALL" || result.data.subjects.some((subject: SubjectSummary) => subject.id === current)
          ? current
          : "ALL",
      );
    } catch (error) {
      setData(null);
      toast.error(error instanceof Error ? error.message : "Unable to load subject performance.");
    } finally {
      setLoading(false);
    }
  }, [classId, examId, ready, scope, sectionId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPerformance(), 150);
    return () => window.clearTimeout(timeout);
  }, [loadPerformance]);

  const visibleSubjects = data?.subjects.filter(
    (subject) => selectedSubjectId === "ALL" || subject.id === selectedSubjectId,
  ) ?? [];

  return (
    <div className="space-y-6 p-4 pb-10 sm:p-6">
      <PageHeader
        eyebrow="Academic Performance"
        title="Subject-wise Performance"
        description="Compare every student's marks, grade, pass status and subject-level class outcomes for one examination."
        action={<Button variant="outline" disabled={!ready || loading} onClick={() => void loadPerformance()}><RefreshCw className={cn("size-4", loading && "animate-spin")} />Refresh</Button>}
      />

      <Card className="border-border/60"><CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <ScopeButton active={scope === "CLASS"} onClick={() => { setScope("CLASS"); setSectionId(""); }}>Class-wise</ScopeButton>
          <ScopeButton active={scope === "SECTION"} onClick={() => setScope("SECTION")}>Section-wise</ScopeButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Filter label="Academic year"><AcademicYearSelect value={academicYearId} autoSelectActive={false} disabled={loadingExams} onChange={(value) => { setAcademicYearId(value); setExamId(exams.find((exam) => exam.academicYearId === value)?.id ?? ""); setClassId(""); setSectionId(""); }} /></Filter>
          <Filter label="Examination"><Select value={examId} onValueChange={setExamId} disabled={loadingExams || !filteredExams.length}><SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger><SelectContent>{filteredExams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>)}</SelectContent></Select></Filter>
          <Filter label="Syllabus"><SyllabusSelect value={syllabusId} onChange={(value) => { setSyllabusId(value); setBranchId(""); setClassId(""); setSectionId(""); }} /></Filter>
          <Filter label="Academic branch"><AcademicBranchSelect syllabusId={syllabusId} value={branchId} onChange={(value) => { setBranchId(value); setClassId(""); setSectionId(""); }} /></Filter>
          <Filter label="Class"><ClassSelect key={`${academicYearId}:${syllabusId}:${branchId}`} syllabusId={syllabusId} branchId={branchId} academicYearId={academicYearId} value={classId} disabled={!branchId} onChange={(value) => { setClassId(value); setSectionId(""); }} /></Filter>
          <Filter label="Section"><SectionSelect key={`${academicYearId}:${classId}`} classId={classId} academicYearId={academicYearId} value={sectionId} allowAll={false} disabled={scope === "CLASS" || !classId} placeholder={scope === "CLASS" ? "All sections" : "Select section"} onChange={setSectionId} /></Filter>
          <Filter label="Displayed subject"><Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!data?.subjects.length}><SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger><SelectContent><SelectItem value="ALL">All subjects</SelectItem>{data?.subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></Filter>
        </div>
      </CardContent></Card>

      {loading && <Card><CardContent className="flex min-h-56 items-center justify-center"><LoaderCircle className="size-8 animate-spin text-primary" /><span className="ml-3 text-sm text-muted-foreground">Calculating subject performance…</span></CardContent></Card>}

      {!loading && data?.scope && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={UsersRound} label="Students" value={data.totals.students} />
          <Metric icon={BookOpenCheck} label="Completed entries" value={data.totals.completedEntries} />
          <Metric icon={BarChart3} label="Overall pass rate" value={data.totals.passRate === null ? "—" : `${data.totals.passRate.toFixed(1)}%`} />
          <Metric icon={LoaderCircle} label="Pending entries" value={data.totals.pendingEntries} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.subjects.map((subject) => <button type="button" key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={cn("rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/40", selectedSubjectId === subject.id && "border-primary ring-2 ring-primary/10")}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{subject.name}</p><p className="mt-1 text-xs text-muted-foreground">{subject.assessmentType === "GRADE" ? "Grade assessment" : subject.maxMarks === null ? "Marks vary by section" : `${subject.maxMarks} marks`}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{subject.passRate === null ? "—" : `${subject.passRate.toFixed(1)}% pass`}</span></div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center"><Mini label="Average" value={subject.averagePercentage === null ? "—" : `${subject.averagePercentage.toFixed(1)}%`} /><Mini label="Passed" value={subject.passedStudents} /><Mini label="Failed" value={subject.failedStudents} /><Mini label="Pending" value={subject.pendingStudents} /></div>
          </button>)}
        </div>

        <Card className="overflow-hidden border-border/60">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Student performance matrix</h2><p className="mt-1 text-sm text-muted-foreground">{data.scope.class.name}{data.scope.section ? ` · Section ${data.scope.section.name}` : " · All sections"}{data.scope.restricted ? " · Assigned subjects only" : ""}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/30"><tr><th className="sticky left-0 z-10 min-w-64 bg-muted/95 px-5 py-3 text-left">Student</th><th className="px-4 py-3 text-left">Section</th>{visibleSubjects.map((subject) => <th key={subject.id} className="min-w-40 px-4 py-3 text-center">{subject.name}</th>)}</tr></thead><tbody>{data.students.map((student) => <tr key={student.studentId} className="border-t"><td className="sticky left-0 bg-card px-5 py-4"><Link className="font-semibold hover:text-primary" href={`/${schoolSlug}/students/${student.studentId}`}>{student.fullName}</Link><p className="mt-1 text-xs text-muted-foreground">{student.admissionNo}{student.rollNo ? ` · Roll ${student.rollNo}` : ""}</p></td><td className="px-4 py-4 text-muted-foreground">{student.section.name}</td>{visibleSubjects.map((subject) => <ResultCell key={subject.id} result={student.results.find((result) => result.subjectId === subject.id)} />)}</tr>)}</tbody></table></div>
        </Card>
      </>}

      {!loading && ready && data && !data.scope && <Card><CardContent className="py-16 text-center"><BookOpenCheck className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 font-semibold">No exam schedules found</p><p className="mt-1 text-sm text-muted-foreground">Choose a class or section scheduled for this examination.</p></CardContent></Card>}
      {!loading && !ready && <Card><CardContent className="py-16 text-center"><BarChart3 className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 font-semibold">Choose the performance scope</p><p className="mt-1 text-sm text-muted-foreground">Select an exam and class. Select a section for section-wise analysis.</p></CardContent></Card>}
    </div>
  );
}

function ResultCell({ result }: { result?: StudentResult }) {
  if (!result) return <td className="px-4 py-4 text-center text-muted-foreground">—</td>;
  const value = result.assessmentType === "GRADE"
    ? result.grade || "—"
    : result.status === "ABSENT" ? "Absent" : result.status === "EXEMPTED" ? "Exempt" : result.status === "PENDING" ? "Pending" : `${result.marksObtained ?? 0} / ${result.maxMarks}`;
  return <td className="px-4 py-4 text-center"><p className="font-semibold">{value}</p>{result.percentage !== null && <p className="mt-1 text-xs text-muted-foreground">{result.percentage.toFixed(1)}%</p>}<span className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", statusClass(result.status))}>{result.status}</span></td>;
}

function statusClass(status: StudentResult["status"]) {
  if (status === "PASS") return "bg-emerald-100 text-emerald-700";
  if (status === "FAIL" || status === "ABSENT") return "bg-rose-100 text-rose-700";
  if (status === "EXEMPTED") return "bg-sky-100 text-sky-700";
  return "bg-amber-100 text-amber-700";
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>; }
function ScopeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <Button type="button" variant={active ? "default" : "outline"} size="sm" onClick={onClick}>{children}</Button>; }
function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string | number }) { return <Card><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="size-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>; }
function Mini({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-muted/50 px-2 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>; }
