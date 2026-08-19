"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
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
  };

  subjects: SubjectResult[];
};

type Props = {
  schoolSlug: string;
  examId: string;
  studentId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function StudentExamResultPage({
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
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load student result.");
        return;
      }

      setData(result.data);
    } catch (error) {
      console.error("Failed to load student exam result:", error);

      toast.error("Failed to load student result.");
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResult();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadResult]);

  if (loading) {
    return <div className="p-6">Loading student result...</div>;
  }

  if (!data) {
    return <div className="p-6">Student result not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              router.push(`/${schoolSlug}/exams/${examId}/results`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">Student Exam Result</h1>

            <p className="text-sm text-muted-foreground">
              {data.exam.name} • {data.exam.academicYear.name}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => void loadResult()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Student Information */}

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Student Name</div>

            <div className="mt-1 font-semibold">
              {data.student.fullName || "Unnamed Student"}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">
              Admission Number
            </div>

            <div className="mt-1 font-semibold">{data.student.admissionNo}</div>
          </div>
        </CardContent>
      </Card>

      {/* Result Summary */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Total Marks</div>

            <div className="mt-2 text-xl font-semibold">
              {data.summary.totalObtained} / {data.summary.totalMaxMarks}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Percentage</div>

            <div className="mt-2 text-xl font-semibold">
              {data.summary.percentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Subjects Passed</div>

            <div className="mt-2 text-xl font-semibold">
              {data.summary.passedSubjects} / {data.summary.totalSubjects}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Overall Result</div>

            <div
              className={
                data.summary.status === "PASS"
                  ? "mt-2 text-xl font-semibold text-green-600"
                  : "mt-2 text-xl font-semibold text-destructive"
              }
            >
              {data.summary.status}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Results */}

      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Results ({data.subjects.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {data.subjects.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No marks found for this student.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Subject</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Exam Date</th>
                    <th className="p-3 text-right">Max Marks</th>
                    <th className="p-3 text-right">Pass Marks</th>
                    <th className="p-3 text-right">Obtained</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {data.subjects.map((subject) => (
                    <tr key={subject.scheduleId} className="border-b">
                      <td className="p-3 font-medium">
                        {subject.subject.name}

                        {subject.subject.code && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({subject.subject.code})
                          </span>
                        )}
                      </td>

                      <td className="p-3">{subject.class.name}</td>

                      <td className="p-3">{subject.section?.name || "All"}</td>

                      <td className="p-3">{formatDate(subject.examDate)}</td>

                      <td className="p-3 text-right">{subject.maxMarks}</td>

                      <td className="p-3 text-right">
                        {subject.passMarks ?? "—"}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {subject.resultStatus === "ABSENT"
                          ? "ABSENT"
                          : (subject.marksObtained ?? "—")}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={
                            subject.resultStatus === "PASS"
                              ? "font-semibold text-green-600"
                              : subject.resultStatus === "ABSENT"
                                ? "font-semibold text-muted-foreground"
                                : "font-semibold text-destructive"
                          }
                        >
                          {subject.resultStatus}
                        </span>
                      </td>

                      <td className="p-3">{subject.remarks || "—"}</td>
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
