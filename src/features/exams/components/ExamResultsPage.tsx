"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassSelect, SectionSelect } from "@/components/common/select";

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

export function ExamResultsPage({ schoolSlug, examId }: Props) {
  const router = useRouter();

  const [selectedClassId, setSelectedClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const [data, setData] = useState<ExamResultData | null>(null);

  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (selectedClassId) {
        params.set("classId", selectedClassId);
      }

      if (sectionId) {
        params.set("sectionId", sectionId);
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/v1/exams/${examId}/results${
          queryString ? `?${queryString}` : ""
        }`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load exam results.");

        return;
      }

      setData(result.data);
    } catch (error) {
      console.error("Failed to load exam results:", error);

      toast.error("Failed to load exam results.");
    } finally {
      setLoading(false);
    }
  }, [examId, selectedClassId, sectionId]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  if (loading) {
    return <div className="p-6">Loading exam results...</div>;
  }

  if (!data) {
    return <div className="p-6">Results not found.</div>;
  }

  const totalStudents = data.results.length;

  const passCount = data.results.filter(
    (student) => student.status === "PASS",
  ).length;

  const failCount = data.results.filter(
    (student) => student.status === "FAIL",
  ).length;

  const absentCount = data.results.filter(
    (student) => student.absentSubjects > 0,
  ).length;

  const passPercentage =
    totalStudents > 0
      ? Number(((passCount / totalStudents) * 100).toFixed(2))
      : 0;

  const percentages = data.results.map((student) => student.percentage);

  const highestPercentage =
    percentages.length > 0 ? Math.max(...percentages) : 0;

  const lowestPercentage =
    percentages.length > 0 ? Math.min(...percentages) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">Exam Results</h1>

            <p className="text-sm text-muted-foreground">{data.exam.name}</p>
          </div>
        </div>

        <Button variant="outline" onClick={() => void loadResults()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-64">
              <ClassSelect
                value={selectedClassId}
                onChange={(value) => {
                  setSelectedClassId(value);
                  setSectionId("");
                }}
              />
            </div>

            <div className="w-full sm:w-64">
              <SectionSelect
                value={sectionId}
                onChange={setSectionId}
                classId={selectedClassId}
                disabled={!selectedClassId}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Statistics */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Students */}

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Total Students</div>

            <div className="mt-2 text-2xl font-semibold">{totalStudents}</div>
          </CardContent>
        </Card>

        {/* Passed */}

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Passed</div>

            <div className="mt-2 text-2xl font-semibold">{passCount}</div>
          </CardContent>
        </Card>

        {/* Failed */}

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Failed</div>

            <div className="mt-2 text-2xl font-semibold">{failCount}</div>
          </CardContent>
        </Card>

        {/* Pass Percentage */}

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Pass Percentage</div>

            <div className="mt-2 text-2xl font-semibold">
              {passPercentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        {/* Highest Percentage */}

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">
              Highest Percentage
            </div>

            <div className="mt-2 text-2xl font-semibold">
              {highestPercentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        {/* Lowest Percentage */}

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">
              Lowest Percentage
            </div>

            <div className="mt-2 text-2xl font-semibold">
              {lowestPercentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}

      <Card>
        <CardHeader>
          <CardTitle>Student Results ({data.results.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {data.results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No marks have been entered for this exam yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Rank</th>

                    <th className="p-3">Admission No.</th>

                    <th className="p-3">Student Name</th>

                    <th className="p-3 text-center">Subjects</th>

                    <th className="p-3 text-right">Marks</th>

                    <th className="p-3 text-right">Percentage</th>

                    <th className="p-3 text-center">Passed</th>

                    <th className="p-3 text-center">Failed</th>

                    <th className="p-3 text-center">Absent</th>

                    <th className="p-3 text-center">Result</th>
                  </tr>
                </thead>

                <tbody>
                  {data.results.map((student) => (
                    <tr key={student.studentId} className="border-b">
                      <td className="p-3 font-semibold">#{student.rank}</td>

                      <td className="p-3">{student.admissionNo}</td>

                      <td className="p-3 font-medium">{student.fullName}</td>

                      <td className="p-3 text-center">{student.subjects}</td>

                      <td className="p-3 text-right font-medium">
                        {student.totalObtained} / {student.totalMaxMarks}
                      </td>

                      <td className="p-3 text-right">
                        {student.percentage.toFixed(2)}%
                      </td>

                      <td className="p-3 text-center">
                        {student.passedSubjects}
                      </td>

                      <td className="p-3 text-center">
                        {student.failedSubjects}
                      </td>

                      <td className="p-3 text-center">
                        {student.absentSubjects}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={
                            student.status === "PASS"
                              ? "font-semibold text-green-600"
                              : "font-semibold text-destructive"
                          }
                        >
                          {student.status}
                        </span>
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
