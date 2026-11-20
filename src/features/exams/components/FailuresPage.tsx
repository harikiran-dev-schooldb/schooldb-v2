"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpenCheck,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  UserRoundX,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";
import { AcademicBranchSelect } from "@/components/common/select/AcademicBranchSelect";
import { SyllabusSelect } from "@/components/common/select/SyllabusSelect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentFollowUpLink, useCanCreateStudentFollowUp } from "@/features/student-follow-ups/components/StudentFollowUpLink";
import { cn } from "@/lib/utils";

type ExamOption = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  academicYearId: string;
  academicYear: { id: string; name: string; active: boolean };
};

type FailedStudent = {
  studentId: string;
  admissionNo: string;
  fullName: string;
  imageUrl: string | null;
  rollNo: number | null;
  section: { id: string; name: string };
  subjects: number;
  failedSubjects: number;
  failedSubjectNames: string[];
  absentSubjects: number;
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number;
};

type FailuresData = {
  exam: {
    id: string;
    name: string;
    academicYear: { id: string; name: string };
  };
  scope: {
    class: { id: string; name: string };
    section: { id: string; name: string } | null;
    restricted?: boolean;
  } | null;
  eligibleStudents: number;
  passingStudents: number;
  pendingStudents: number;
  failures: FailedStudent[];
};

type Props = { schoolSlug: string };
type ResultScope = "CLASS" | "SECTION";
type ReportRequest = { url: string; attempt: number };
type ReportResult = { request: ReportRequest } & (
  | { data: FailuresData; error?: never }
  | { error: string; data?: never }
);

export function FailuresPage({ schoolSlug }: Props) {
  const canCreateFollowUp = useCanCreateStudentFollowUp("EXAM_FAILURE");
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [scope, setScope] = useState<ResultScope>("CLASS");
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [reportAttempt, setReportAttempt] = useState(0);
  const [loadingExams, setLoadingExams] = useState(true);
  const [examOptionsError, setExamOptionsError] = useState<string | null>(null);
  const [examOptionsAttempt, setExamOptionsAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadExams() {
      try {
        const response = await fetch("/api/v1/exams/failure-options", {
          cache: "no-store",
          signal,
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load examinations.");
        }

        if (signal.aborted) return;

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
        if (!signal.aborted) {
          setExamOptionsError(
            error instanceof Error
              ? error.message
              : "Unable to load examinations.",
          );
        }
      } finally {
        if (!signal.aborted) setLoadingExams(false);
      }
    }

    void loadExams();
    return () => controller.abort();
  }, [examOptionsAttempt]);

  const filteredExams = useMemo(
    () => exams.filter((exam) => exam.academicYearId === academicYearId),
    [academicYearId, exams],
  );

  const reportRequest = useMemo<ReportRequest | null>(() => {
    if (!examId || !classId || (scope === "SECTION" && !sectionId)) return null;

    const params = new URLSearchParams({ classId });
    if (scope === "SECTION") params.set("sectionId", sectionId);

    return {
      url: `/api/v1/exams/${encodeURIComponent(examId)}/failures?${params}`,
      attempt: reportAttempt,
    };
  }, [classId, examId, scope, sectionId, reportAttempt]);

  useEffect(() => {
    if (!reportRequest) return;
    const request = reportRequest;
    const controller = new AbortController();
    const { signal } = controller;

    async function loadFailures() {
      try {
        const response = await fetch(request.url, { cache: "no-store", signal });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load failures.");
        }

        if (!signal.aborted) setReportResult({ request, data: result.data });
      } catch (error) {
        if (!signal.aborted) {
          setReportResult({
            request,
            error: error instanceof Error ? error.message : "Unable to load failures.",
          });
        }
      }
    }

    const timeout = window.setTimeout(() => void loadFailures(), 150);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reportRequest]);

  const currentReport = reportResult?.request === reportRequest ? reportResult : null;
  const data = currentReport?.data;
  const loading = Boolean(reportRequest && !currentReport);
  const ready = reportRequest !== null;

  function retryReport() {
    setReportAttempt((attempt) => attempt + 1);
  }

  function retryExamOptions() {
    setExamOptionsError(null);
    setLoadingExams(true);
    setExamOptionsAttempt((attempt) => attempt + 1);
  }

  function changeAcademicYear(value: string) {
    setAcademicYearId(value);
    setExamId(exams.find((exam) => exam.academicYearId === value)?.id ?? "");
    setClassId("");
    setSectionId("");
  }

  return (
    <div className="space-y-6 p-4 pb-10 sm:p-6">
      <PageHeader
        eyebrow="Academic Performance"
        title="Exam Failures"
        description="Identify students who failed one or more subjects using the same pass marks and absence rules as examination results."
        action={
          <Button
            variant="outline"
            disabled={!ready || loading}
            onClick={retryReport}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh failures
          </Button>
        }
      />

      <section className="premium-hero px-6 py-7 sm:px-8">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200/70 dark:bg-rose-950/30 dark:ring-rose-800/50">
              <ShieldAlert className="size-7 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                Intervention board
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Focus support where it is needed
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review the whole class or one section. Students with incomplete
                marks remain outside the failure list until results are complete.
              </p>
            </div>
          </div>
          {data?.scope && (
            <div className="rounded-2xl border border-rose-200/70 bg-white/85 px-5 py-3 shadow-sm dark:border-rose-900/60 dark:bg-background/85">
              <p className="text-sm text-muted-foreground">Current review</p>
              <p className="mt-1 font-semibold">
                {data.scope.class.name}
                {data.scope.section
                  ? ` · Section ${data.scope.section.name}`
                  : data.scope.restricted
                    ? " · Assigned sections"
                    : " · All sections"}
              </p>
              {data.scope.restricted && (
                <p className="mt-1 text-sm text-muted-foreground">Assigned subjects only</p>
              )}
            </div>
          )}
        </div>
      </section>

      <Card className="overflow-hidden border-border/60 shadow-[0_18px_45px_-34px_rgb(15_23_42_/_0.35)]">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <ScopeButton
              active={scope === "CLASS"}
              onClick={() => {
                setScope("CLASS");
                setSectionId("");
              }}
            >
              Class-wise
            </ScopeButton>
            <ScopeButton
              active={scope === "SECTION"}
              onClick={() => setScope("SECTION")}
            >
              Class & section-wise
            </ScopeButton>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Filter label="Academic year">
              <AcademicYearSelect
                value={academicYearId}
                onChange={changeAcademicYear}
                autoSelectActive={false}
                disabled={loadingExams}
              />
            </Filter>
            <Filter label="Examination">
              <Select
                value={examId}
                onValueChange={setExamId}
                disabled={loadingExams || filteredExams.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingExams ? "Loading exams..." : "Select exam"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Syllabus">
              <SyllabusSelect
                value={syllabusId}
                onChange={(value) => {
                  setSyllabusId(value);
                  setBranchId("");
                  setClassId("");
                  setSectionId("");
                }}
              />
            </Filter>
            <Filter label="Academic branch">
              <AcademicBranchSelect
                syllabusId={syllabusId}
                value={branchId}
                onChange={(value) => {
                  setBranchId(value);
                  setClassId("");
                  setSectionId("");
                }}
              />
            </Filter>
            <Filter label="Class">
              <ClassSelect
                key={`${academicYearId}:${syllabusId}:${branchId}`}
                syllabusId={syllabusId}
                branchId={branchId}
                academicYearId={academicYearId}
                value={classId}
                disabled={!branchId}
                onChange={(value) => {
                  setClassId(value);
                  setSectionId("");
                }}
              />
            </Filter>
            <Filter label="Section" muted={scope === "CLASS"}>
              <SectionSelect
                key={`${academicYearId}:${classId}`}
                classId={classId}
                academicYearId={academicYearId}
                value={sectionId}
                allowAll={false}
                disabled={scope === "CLASS" || !classId}
                placeholder={scope === "CLASS" ? "All sections" : "Select section"}
                onChange={setSectionId}
              />
            </Filter>
          </div>
        </CardContent>
      </Card>

      {examOptionsError && (
        <EmptyState
          icon={ShieldAlert}
          title="Could not load examinations"
          description={examOptionsError}
          action={<Button variant="outline" onClick={retryExamOptions}>Try again</Button>}
        />
      )}

      {!examOptionsError && !loadingExams && filteredExams.length === 0 && (
        <EmptyState
          icon={BookOpenCheck}
          title="No examinations available"
          description={academicYearId
            ? "Choose another academic year to review its examinations."
            : "There are no examinations available for this report."}
        />
      )}

      {!ready && !loadingExams && !examOptionsError && filteredExams.length > 0 && (
        <EmptyState
          icon={BookOpenCheck}
          title="Choose the result details"
          description="Select an academic year, examination and class. For section-wise review, select a section too."
        />
      )}

      {(loadingExams || loading) && (
        <Card className="border-border/60" role="status">
          <CardContent className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <LoaderCircle className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                {loadingExams ? "Loading examinations..." : "Checking completed results..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentReport?.error && (
        <EmptyState
          icon={ShieldAlert}
          title="Could not load exam failures"
          description={currentReport.error}
          action={<Button variant="outline" onClick={retryReport}>Try again</Button>}
        />
      )}

      {data && !data.scope && (
        <EmptyState
          icon={BookOpenCheck}
          title="No exam schedules"
          description="Choose a class or section with schedules for this examination."
        />
      )}

      {data?.scope && data.eligibleStudents === 0 && (
        <EmptyState
          icon={data.pendingStudents > 0 ? Clock3 : BookOpenCheck}
          title="No completed results"
          description={data.pendingStudents > 0
            ? `${data.pendingStudents} student result${data.pendingStudents === 1 ? " is" : "s are"} still awaiting complete marks.`
            : "There are no assessed students for the selected class or section."}
        />
      )}

      {data?.scope && data.eligibleStudents > 0 && data.failures.length === 0 && (
        <EmptyState
          icon={CircleCheckBig}
          title="No failed students"
          description={
            data.pendingStudents > 0
              ? `${data.pendingStudents} student result${data.pendingStudents === 1 ? " is" : "s are"} still incomplete and excluded from this review.`
              : "Every student with a completed result passed all assessed subjects."
          }
          success
        />
      )}

      {data && data.failures.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              icon={UserRoundX}
              label="Students needing support"
              value={data.failures.length}
              tone="danger"
            />
            <Metric
              icon={CircleCheckBig}
              label="Students passed"
              value={data.passingStudents}
              tone="success"
            />
            <Metric
              icon={Clock3}
              label="Awaiting complete marks"
              value={data.pendingStudents}
              tone="muted"
            />
          </div>

          <Card className="overflow-hidden border-border/60 shadow-[0_20px_50px_-38px_rgb(15_23_42_/_0.4)]">
            <div className="flex flex-col gap-2 border-b border-border/60 bg-rose-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-rose-950/10">
              <div>
                <h3 className="font-semibold">Failed students</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Ordered by failed-subject count, then lowest percentage.
                </p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {data.failures.length} student
                {data.failures.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-muted/30 text-sm text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">Section</th>
                    <th className="px-5 py-3 text-center">Failed subjects</th>
                    <th className="px-5 py-3 text-center">Absent</th>
                    <th className="px-5 py-3 text-right">Marks</th>
                    <th className="px-5 py-3 text-right">Percentage</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.failures.map((student) => (
                    <tr
                      key={student.studentId}
                      className="border-t border-border/50 transition-colors hover:bg-rose-500/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <StudentAvatar student={student} />
                          <div>
                            <p className="font-semibold text-foreground">
                              {student.fullName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Admission {student.admissionNo}
                              {student.rollNo ? ` · Roll ${student.rollNo}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {student.section.name}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-rose-100 px-3 py-1.5 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {student.failedSubjects}
                        </span>
                        <p className="mx-auto mt-1.5 max-w-48 text-xs text-muted-foreground">
                          {student.failedSubjectNames.join(", ")}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center text-muted-foreground">
                        {student.absentSubjects}
                      </td>
                      <td className="px-5 py-4 text-right font-medium">
                        {student.totalObtained}{" "}
                        <span className="text-muted-foreground">
                          / {student.totalMaxMarks}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="rounded-full bg-rose-500/10 px-3 py-1.5 font-bold text-rose-700 dark:text-rose-300">
                          {student.percentage.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canCreateFollowUp && (
                            <StudentFollowUpLink
                              schoolSlug={schoolSlug}
                              origin={{
                                studentId: student.studentId,
                                examId: data.exam.id,
                                academicYearId: data.exam.academicYear.id,
                                source: "EXAM_FAILURE",
                              }}
                            />
                          )}
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/${schoolSlug}/students/${student.studentId}`}>
                              View <ChevronRight className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
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

function Filter({
  label,
  muted,
  children,
}: {
  label: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", muted && "opacity-60")}>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function StudentAvatar({ student }: { student: FailedStudent }) {
  const initials = student.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <Avatar className="size-11 ring-4 ring-rose-500/5">
      <AvatarImage src={student.imageUrl ?? undefined} alt={student.fullName} />
      <AvatarFallback className="bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "danger" | "success" | "muted";
}) {
  const toneClass = {
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  success = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  success?: boolean;
}) {
  return (
    <Card className="border-dashed border-border/70">
      <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl",
            success
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-7" />
        </span>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
