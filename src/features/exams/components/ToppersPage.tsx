"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpenCheck,
  ChevronRight,
  LoaderCircle,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ExamOption = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  academicYearId: string;
  academicYear: { id: string; name: string; active: boolean };
};

type Topper = {
  studentId: string;
  admissionNo: string;
  fullName: string;
  imageUrl: string | null;
  rollNo: number | null;
  section: { id: string; name: string };
  subjects: number;
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number;
  status: "PASS" | "FAIL";
  rank: number;
};

type ToppersData = {
  exam: {
    id: string;
    name: string;
    academicYear: { id: string; name: string };
  };
  scope: {
    class: { id: string; name: string };
    section: { id: string; name: string } | null;
  } | null;
  requestedLimit: number;
  eligibleStudents: number;
  pendingStudents: number;
  toppers: Topper[];
};

type Props = { schoolSlug: string };
type RankingScope = "CLASS" | "SECTION";

const presetCounts = [5, 10, 20];

export function ToppersPage({ schoolSlug }: Props) {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [scope, setScope] = useState<RankingScope>("CLASS");
  const [topCount, setTopCount] = useState(10);
  const [data, setData] = useState<ToppersData | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadExams() {
      try {
        const response = await fetch("/api/v1/exams", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load examinations.");
        }

        if (!active) return;

        const available = (result.data as ExamOption[]).filter(
          (exam) => exam.status !== "CANCELLED",
        );
        setExams(available);

        const preferred =
          available.find((exam) => exam.academicYear.active) ?? available[0];

        if (preferred) {
          setAcademicYearId(preferred.academicYearId);
          setExamId(preferred.id);
        }
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load examinations.",
          );
        }
      } finally {
        if (active) setLoadingExams(false);
      }
    }

    void loadExams();
    return () => {
      active = false;
    };
  }, []);

  const filteredExams = useMemo(
    () => exams.filter((exam) => exam.academicYearId === academicYearId),
    [academicYearId, exams],
  );

  const loadToppers = useCallback(async () => {
    if (!examId || !classId || (scope === "SECTION" && !sectionId)) {
      setData(null);
      return;
    }

    const params = new URLSearchParams({
      classId,
      limit: String(topCount),
    });
    if (scope === "SECTION") params.set("sectionId", sectionId);

    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/exams/${encodeURIComponent(examId)}/toppers?${params}`,
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load toppers.");
      }

      setData(result.data);
    } catch (error) {
      setData(null);
      toast.error(error instanceof Error ? error.message : "Unable to load toppers.");
    } finally {
      setLoading(false);
    }
  }, [classId, examId, scope, sectionId, topCount]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadToppers(), 150);
    return () => window.clearTimeout(timeout);
  }, [loadToppers]);

  const podium = data?.toppers.filter((student) => student.rank <= 3) ?? [];
  const ready = Boolean(examId && classId && (scope === "CLASS" || sectionId));

  function changeAcademicYear(value: string) {
    setAcademicYearId(value);
    setExamId(exams.find((exam) => exam.academicYearId === value)?.id ?? "");
    setData(null);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Academic Performance"
        title="Class Toppers"
        description="Celebrate the highest-ranked students using the same marks, percentages and tie rules as examination results."
        action={
          <Button variant="outline" disabled={!ready || loading} onClick={() => void loadToppers()}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh ranking
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-7 text-white shadow-[0_28px_70px_-38px_rgb(67_56_202_/_0.7)] sm:px-8">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <Trophy className="size-7 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
                Merit board
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Recognise academic excellence
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-indigo-100/75">
                Compare the whole class or rank one section independently. Students with incomplete marks stay outside the ranking.
              </p>
            </div>
          </div>
          {data?.scope && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-3 backdrop-blur">
              <p className="text-xs text-indigo-100/65">Current leaderboard</p>
              <p className="mt-1 font-semibold">
                {data.scope.class.name}
                {data.scope.section ? ` · Section ${data.scope.section.name}` : " · All sections"}
              </p>
            </div>
          )}
        </div>
      </section>

      <Card className="overflow-hidden border-border/60 shadow-[0_18px_45px_-34px_rgb(15_23_42_/_0.35)]">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <ScopeButton active={scope === "CLASS"} onClick={() => { setScope("CLASS"); setSectionId(""); }}>
              Class-wise
            </ScopeButton>
            <ScopeButton active={scope === "SECTION"} onClick={() => setScope("SECTION")}>
              Class & section-wise
            </ScopeButton>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Filter label="Academic year">
              <AcademicYearSelect value={academicYearId} onChange={changeAcademicYear} />
            </Filter>
            <Filter label="Examination">
              <Select value={examId} onValueChange={(value) => { setExamId(value); setData(null); }} disabled={loadingExams || !academicYearId}>
                <SelectTrigger><SelectValue placeholder={loadingExams ? "Loading exams..." : "Select exam"} /></SelectTrigger>
                <SelectContent>
                  {filteredExams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Class">
              <ClassSelect value={classId} onChange={(value) => { setClassId(value); setSectionId(""); setData(null); }} />
            </Filter>
            <Filter label="Section" muted={scope === "CLASS"}>
              <SectionSelect classId={classId} value={sectionId} allowAll={false} disabled={scope === "CLASS" || !classId} placeholder={scope === "CLASS" ? "All sections" : "Select section"} onChange={(value) => { setSectionId(value); setData(null); }} />
            </Filter>
            <Filter label="Top ranks">
              <div className="flex gap-2">
                <div className="flex flex-1 rounded-xl border border-border bg-muted/30 p-1">
                  {presetCounts.map((count) => (
                    <button key={count} type="button" onClick={() => setTopCount(count)} className={cn("flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition", topCount === count ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>{count}</button>
                  ))}
                </div>
                <Input aria-label="Custom top rank count" title="Custom top rank count" type="number" min={1} max={100} value={topCount} onChange={(event) => setTopCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} className="w-20 text-center font-semibold" />
              </div>
            </Filter>
          </div>
        </CardContent>
      </Card>

      {!ready && <EmptyState icon={BookOpenCheck} title="Choose the ranking details" description="Select an academic year, examination and class. For section-wise ranking, select a section too." />}

      {ready && loading && (
        <Card className="border-border/60"><CardContent className="flex min-h-72 items-center justify-center"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Calculating ranks...</p></div></CardContent></Card>
      )}

      {ready && !loading && data && data.toppers.length === 0 && (
        <EmptyState icon={Award} title="No completed results yet" description="Enter marks for every scheduled subject. Students with pending marks are intentionally not ranked." />
      )}

      {ready && !loading && data && data.toppers.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {podium.map((student) => <PodiumCard key={student.studentId} student={student} />)}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={UsersRound} label="Ranked students" value={data.eligibleStudents} />
            <Metric icon={Sparkles} label="Ranks displayed" value={`Top ${data.requestedLimit}`} />
            <Metric icon={BookOpenCheck} label="Awaiting complete marks" value={data.pendingStudents} />
          </div>

          <Card className="overflow-hidden border-border/60 shadow-[0_20px_50px_-38px_rgb(15_23_42_/_0.4)]">
            <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-semibold">Top performers</h3><p className="mt-0.5 text-xs text-muted-foreground">Tied students receive the same rank and are all included.</p></div>
              <span className="text-xs font-semibold text-muted-foreground">{data.toppers.length} student{data.toppers.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 text-left">Rank</th><th className="px-5 py-3 text-left">Student</th><th className="px-5 py-3 text-left">Section</th><th className="px-5 py-3 text-right">Marks</th><th className="px-5 py-3 text-right">Percentage</th><th className="px-5 py-3 text-right">Profile</th></tr></thead>
                <tbody>
                  {data.toppers.map((student) => (
                    <tr key={student.studentId} className="border-t border-border/50 transition-colors hover:bg-primary/[0.025]">
                      <td className="px-5 py-4"><Rank rank={student.rank} /></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><StudentAvatar student={student} /><div><p className="font-semibold text-foreground">{student.fullName}</p><p className="text-xs text-muted-foreground">Admission {student.admissionNo}{student.rollNo ? ` · Roll ${student.rollNo}` : ""}</p></div></div></td>
                      <td className="px-5 py-4 text-muted-foreground">{student.section.name}</td>
                      <td className="px-5 py-4 text-right font-medium">{student.totalObtained} <span className="text-muted-foreground">/ {student.totalMaxMarks}</span></td>
                      <td className="px-5 py-4 text-right"><span className="rounded-full bg-primary/10 px-3 py-1.5 font-bold text-primary">{student.percentage.toFixed(2)}%</span></td>
                      <td className="px-5 py-4 text-right"><Button asChild variant="ghost" size="sm"><Link href={`/${schoolSlug}/students/${student.studentId}`}>View <ChevronRight className="size-4" /></Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Filter({ label, muted, children }: { label: string; muted?: boolean; children: React.ReactNode }) {
  return <div className={cn("space-y-2", muted && "opacity-60")}><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}

function ScopeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition-all", active ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>{children}</button>;
}

function StudentAvatar({ student }: { student: Topper }) {
  const initials = student.fullName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <Avatar className="size-11 ring-4 ring-primary/5"><AvatarImage src={student.imageUrl ?? undefined} alt={student.fullName} /><AvatarFallback className="bg-primary/10 font-bold text-primary">{initials}</AvatarFallback></Avatar>;
}

function PodiumCard({ student }: { student: Topper }) {
  const styles = student.rank === 1 ? "from-amber-50 to-orange-50 border-amber-200/70 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-700/30" : student.rank === 2 ? "from-slate-50 to-zinc-50 border-slate-200 dark:from-slate-900 dark:to-zinc-900 dark:border-slate-700" : "from-orange-50 to-amber-50 border-orange-200/70 dark:from-orange-950/25 dark:to-amber-950/20 dark:border-orange-800/30";
  return <div className={cn("relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5", styles)}><div className="absolute right-4 top-4 text-5xl font-black text-foreground/[0.05]">{student.rank}</div><div className="relative flex items-center gap-4"><div className="relative"><StudentAvatar student={student} /><span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-black text-background">{student.rank}</span></div><div className="min-w-0"><p className="truncate font-bold">{student.fullName}</p><p className="mt-0.5 text-xs text-muted-foreground">Section {student.section.name} · {student.admissionNo}</p></div></div><div className="relative mt-5 flex items-end justify-between border-t border-foreground/10 pt-4"><div><p className="text-xs text-muted-foreground">Score</p><p className="mt-1 text-2xl font-black tracking-tight">{student.percentage.toFixed(2)}%</p></div><Medal className={cn("size-7", student.rank === 1 ? "text-amber-500" : student.rank === 2 ? "text-slate-400" : "text-orange-600")} /></div></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string | number }) {
  return <Card className="border-border/60"><CardContent className="flex items-center gap-4 p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-bold">{value}</p></div></CardContent></Card>;
}

function Rank({ rank }: { rank: number }) {
  return <span className={cn("inline-flex size-9 items-center justify-center rounded-xl font-black", rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : rank === 2 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" : "bg-muted text-muted-foreground")}>{rank}</span>;
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Award; title: string; description: string }) {
  return <Card className="border-dashed border-border/70"><CardContent className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-7" /></span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p></CardContent></Card>;
}
