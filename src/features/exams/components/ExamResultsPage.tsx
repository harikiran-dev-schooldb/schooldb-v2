"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  Users,
  Trophy,
  CircleCheck,
  CircleX,
  TrendingUp,
  TrendingDown,
  ClipboardList,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ClassSelect, SectionSelect } from "@/components/common/select";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Result = {
  studentId: string;

  admissionNo: string;

  fullName: string;

  totalObtained: number;

  totalMaxMarks: number;

  subjects: number;

  passedSubjects: number;

  failedSubjects: number;

  absentSubjects: number;

  percentage: number;

  status: "PASS" | "FAIL";

  rank: number;
};

type ExamResultData = {
  exam: {
    id: string;

    name: string;
  };

  results: Result[];
};

type Props = {
  schoolSlug: string;

  examId: string;
};

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export function ExamResultsPage({ schoolSlug, examId }: Props) {
  const router = useRouter();

  const [selectedClassId, setSelectedClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const [data, setData] = useState<ExamResultData | null>(null);

  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* LOAD RESULTS                                                            */
  /* ---------------------------------------------------------------------- */

  const loadResults = useCallback(async () => {
    /*
     * Do not load anything until a class is selected.
     */
    if (!selectedClassId) {
      setData(null);
      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();

      params.set("classId", selectedClassId);

      if (sectionId) {
        params.set("sectionId", sectionId);
      }

      const response = await fetch(
        `/api/v1/exams/${examId}/results?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load exam results.");

        setData(null);

        return;
      }

      setData(result.data);
    } catch (error) {
      console.error("Failed to load exam results:", error);

      toast.error("Failed to load exam results.");

      setData(null);
    } finally {
      setLoading(false);
    }
  }, [examId, selectedClassId, sectionId]);

  /* ---------------------------------------------------------------------- */
  /* LOAD WHEN FILTER CHANGES                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResults();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadResults]);

  /* ---------------------------------------------------------------------- */
  /* CALCULATIONS                                                            */
  /* ---------------------------------------------------------------------- */

  const results = data?.results ?? [];

  const totalStudents = results.length;

  const passCount = results.filter(
    (student) => student.status === "PASS",
  ).length;

  const failCount = results.filter(
    (student) => student.status === "FAIL",
  ).length;

  const passPercentage =
    totalStudents > 0
      ? Number(((passCount / totalStudents) * 100).toFixed(2))
      : 0;

  const percentages = results.map((student) => student.percentage);

  const highestPercentage =
    percentages.length > 0 ? Math.max(...percentages) : 0;

  const lowestPercentage =
    percentages.length > 0 ? Math.min(...percentages) : 0;

  /* ---------------------------------------------------------------------- */
  /* CLEAR FILTERS                                                           */
  /* ---------------------------------------------------------------------- */

  function clearFilters() {
    setSelectedClassId("");

    setSectionId("");

    setData(null);
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                       */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Exam Results
              </h1>

              {selectedClassId && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {totalStudents} Students
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {data?.exam.name ?? "Select a class to view results"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          disabled={!selectedClassId || loading}
          onClick={() => void loadResults()}
        >
          <RefreshCw
            className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FILTERS                                                            */}
      {/* ------------------------------------------------------------------ */}

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Class & Section</CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* CLASS */}

            <div className="w-full lg:max-w-xs">
              <ClassSelect
                value={selectedClassId}
                onChange={(value) => {
                  setSelectedClassId(value);

                  /*
                   * Section belongs to
                   * selected class.
                   */
                  setSectionId("");

                  /*
                   * Clear previous results
                   * while new class loads.
                   */
                  setData(null);
                }}
              />
            </div>

            {/* SECTION */}

            <div className="w-full lg:max-w-xs">
              <SectionSelect
                value={sectionId}
                onChange={(value) => {
                  setSectionId(value);
                }}
                classId={selectedClassId}
                disabled={!selectedClassId}
              />
            </div>

            {/* CLEAR */}

            {selectedClassId && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* NO CLASS SELECTED                                                  */}
      {/* ------------------------------------------------------------------ */}

      {!selectedClassId && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <ClipboardList className="size-7 text-muted-foreground" />
            </div>

            <h3 className="mt-4 text-base font-semibold">Select a class</h3>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Select a class to view the examination results. You can optionally
              select a section to view only that section&apos;s students.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* LOADING                                                            */}
      {/* ------------------------------------------------------------------ */}

      {selectedClassId && loading && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto size-7 animate-spin text-muted-foreground" />

              <p className="mt-3 text-sm text-muted-foreground">
                Loading exam results...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RESULTS                                                            */}
      {/* ------------------------------------------------------------------ */}

      {selectedClassId && !loading && data && (
        <>
          {/* ------------------------------------------------------------ */}
          {/* STATISTICS                                                   */}
          {/* ------------------------------------------------------------ */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={<Users className="size-5" />}
              label="Total Students"
              value={totalStudents}
            />

            <StatCard
              icon={<CircleCheck className="size-5" />}
              label="Passed"
              value={passCount}
              description={`${passPercentage.toFixed(2)}% pass rate`}
            />

            <StatCard
              icon={<CircleX className="size-5" />}
              label="Failed"
              value={failCount}
            />

            <StatCard
              icon={<TrendingUp className="size-5" />}
              label="Highest"
              value={`${highestPercentage.toFixed(2)}%`}
            />

            <StatCard
              icon={<TrendingDown className="size-5" />}
              label="Lowest"
              value={`${lowestPercentage.toFixed(2)}%`}
            />
          </div>

          {/* ------------------------------------------------------------ */}
          {/* RESULTS TABLE                                                */}
          {/* ------------------------------------------------------------ */}

          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Student Results
                  </CardTitle>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {sectionId
                      ? "Results for the selected class and section"
                      : "Results for the selected class"}
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">
                  {totalStudents} result
                  {totalStudents !== 1 ? "s" : ""}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {results.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                    <ClipboardList className="size-6 text-muted-foreground" />
                  </div>

                  <h3 className="mt-4 font-semibold">No results available</h3>

                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    No marks have been entered for this exam and selected class
                    {sectionId ? " or section" : ""} yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-muted/30">
                      <tr className="border-b">
                        <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-semibold">
                          Rank
                        </th>

                        <th className="px-4 py-3 text-left font-semibold">
                          Admission No.
                        </th>

                        <th className="px-4 py-3 text-left font-semibold">
                          Student
                        </th>

                        <th className="px-4 py-3 text-center font-semibold">
                          Subjects
                        </th>

                        <th className="px-4 py-3 text-right font-semibold">
                          Marks
                        </th>

                        <th className="px-4 py-3 text-right font-semibold">
                          Percentage
                        </th>

                        <th className="px-4 py-3 text-center font-semibold">
                          Passed
                        </th>

                        <th className="px-4 py-3 text-center font-semibold">
                          Failed
                        </th>

                        <th className="px-4 py-3 text-center font-semibold">
                          Absent
                        </th>

                        <th className="px-4 py-3 text-center font-semibold">
                          Result
                        </th>

                        <th className="px-4 py-3 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {results.map((student) => (
                        <tr
                          key={student.studentId}
                          className="group border-b last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="sticky left-0 z-10 bg-background px-4 py-3 group-hover:bg-muted/30">
                            <RankBadge rank={student.rank} />
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {student.admissionNo}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {student.fullName}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                              {student.subjects}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-medium">
                            {student.totalObtained}

                            <span className="mx-1 text-muted-foreground">
                              /
                            </span>

                            {student.totalMaxMarks}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold">
                              {student.percentage.toFixed(2)}%
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {student.passedSubjects}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {student.failedSubjects}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {student.absentSubjects}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <ResultBadge status={student.status} />
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/${schoolSlug}/exams/${examId}/results/${student.studentId}`,
                                )
                              }
                            >
                              <Eye className="mr-2 size-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STAT CARD                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;

  label: string;

  value: string | number;

  description?: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>

            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>

            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* RANK BADGE                                                                 */
/* -------------------------------------------------------------------------- */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-2 font-bold">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="size-4" />
        </span>

        <span>1</span>
      </div>
    );
  }

  return <span className="font-semibold text-muted-foreground">#{rank}</span>;
}

/* -------------------------------------------------------------------------- */
/* RESULT BADGE                                                               */
/* -------------------------------------------------------------------------- */

function ResultBadge({ status }: { status: "PASS" | "FAIL" }) {
  return (
    <span
      className={
        status === "PASS"
          ? "inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600"
          : "inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
      }
    >
      {status}
    </span>
  );
}
