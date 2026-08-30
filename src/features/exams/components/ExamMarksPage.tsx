"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassSelect, SectionSelect } from "@/components/common/select";
import { Input } from "@/components/ui/input";

type Status = "PRESENT" | "ABSENT";

type Schedule = {
  id: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  examDate: string;
  maxMarks: string | number;
  passMarks: string | number | null;
  class: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  } | null;
  subject: {
    id: string;
    name: string;
    code: string | null;
  };
};

type Student = {
  studentEnrollmentId: string;
  rollNo: string | number | null;
  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
  };
  marks: Record<
    string,
    {
      marksObtained: string;
      status: Status;
      remarks: string;
    }
  >;
};

type Props = {
  schoolSlug: string;
  examId: string;
};

export function ExamMarksPage({ schoolSlug, examId }: Props) {
  const router = useRouter();

  const [examName, setExamName] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);

      const [examResponse, schedulesResponse] = await Promise.all([
        fetch(`/api/v1/exams/${examId}`, { cache: "no-store" }),
        fetch(`/api/v1/exams/${examId}/schedules`, { cache: "no-store" }),
      ]);

      const examResult = await examResponse.json();
      const schedulesResult = await schedulesResponse.json();

      if (!examResponse.ok || !examResult.success) {
        throw new Error(examResult.message || "Failed to load exam.");
      }

      if (!schedulesResponse.ok || !schedulesResult.success) {
        throw new Error(
          schedulesResult.message || "Failed to load exam schedules.",
        );
      }

      setExamName(examResult.data.name);
      setSchedules(
        Array.isArray(schedulesResult.data) ? schedulesResult.data : [],
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load exam.",
      );
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const applicableSchedules = useMemo(() => {
    if (!selectedClassId) return [];

    const matching = schedules.filter(
      (schedule) => schedule.classId === selectedClassId,
    );

    if (!sectionId) {
      return matching;
    }

    const sectionSpecific = matching.filter(
      (schedule) => schedule.sectionId === sectionId,
    );

    const allSections = matching.filter(
      (schedule) => schedule.sectionId === null,
    );

    const subjectIds = new Set(sectionSpecific.map((s) => s.subjectId));

    return [
      ...sectionSpecific,
      ...allSections.filter((schedule) => !subjectIds.has(schedule.subjectId)),
    ].sort((a, b) => {
      const dateCompare =
        new Date(a.examDate).getTime() - new Date(b.examDate).getTime();

      return dateCompare || a.subject.name.localeCompare(b.subject.name);
    });
  }, [schedules, selectedClassId, sectionId]);

  const loadStudents = useCallback(async () => {
    if (!selectedClassId || !sectionId || applicableSchedules.length === 0) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);

      const responses = await Promise.all(
        applicableSchedules.map(async (schedule) => {
          const response = await fetch(
            `/api/v1/exams/schedules/${schedule.id}/marks?sectionId=${encodeURIComponent(
              sectionId,
            )}`,
            { cache: "no-store" },
          );

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.message ||
                `Failed to load ${schedule.subject.name} marks.`,
            );
          }

          return {
            schedule,
            data: result.data,
          };
        }),
      );

      const studentMap = new Map<string, Student>();

      for (const { schedule, data } of responses) {
        for (const row of data.students ?? []) {
          const existing = studentMap.get(row.studentEnrollmentId);

          const student: Student = existing ?? {
            studentEnrollmentId: row.studentEnrollmentId,
            student: row.student,
            rollNo: row.rollNo,
            marks: {},
          };

          student.marks[schedule.id] = {
            marksObtained:
              row.mark?.marksObtained === null ||
              row.mark?.marksObtained === undefined
                ? ""
                : String(row.mark.marksObtained),
            status: row.mark?.status ?? "PRESENT",
            remarks: row.mark?.remarks ?? "",
          };

          studentMap.set(row.studentEnrollmentId, student);
        }
      }

      setStudents(
        Array.from(studentMap.values()).sort((a, b) => {
          const aRoll =
            a.rollNo == null ? Number.MAX_SAFE_INTEGER : Number(a.rollNo);
          const bRoll =
            b.rollNo == null ? Number.MAX_SAFE_INTEGER : Number(b.rollNo);

          return aRoll - bRoll;
        }),
      );
    } catch (error) {
      setStudents([]);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load student marks.",
      );
    } finally {
      setLoading(false);
    }
  }, [applicableSchedules, sectionId, selectedClassId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSchedules();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSchedules]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStudents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStudents]);

  function updateMark(
    studentEnrollmentId: string,
    scheduleId: string,
    value: string,
  ) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              marks: {
                ...student.marks,
                [scheduleId]: {
                  ...student.marks[scheduleId],
                  marksObtained: value,
                },
              },
            }
          : student,
      ),
    );
  }

  function updateStatus(
    studentEnrollmentId: string,
    scheduleId: string,
    status: Status,
  ) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              marks: {
                ...student.marks,
                [scheduleId]: {
                  ...student.marks[scheduleId],
                  status,
                  marksObtained:
                    status === "ABSENT"
                      ? ""
                      : (student.marks[scheduleId]?.marksObtained ?? ""),
                },
              },
            }
          : student,
      ),
    );
  }

  async function saveResults() {
    if (!students.length || !applicableSchedules.length) return;

    for (const schedule of applicableSchedules) {
      const maxMarks = Number(schedule.maxMarks);

      for (const student of students) {
        const mark = student.marks[schedule.id];

        if (!mark || mark.status === "ABSENT" || mark.marksObtained === "") {
          continue;
        }

        const value = Number(mark.marksObtained);

        if (!Number.isFinite(value) || value < 0 || value > maxMarks) {
          toast.error(
            `${student.student.fullName || student.student.admissionNo}: ${schedule.subject.name} must be between 0 and ${maxMarks}.`,
          );
          return;
        }
      }
    }

    try {
      setSaving(true);

      await Promise.all(
        applicableSchedules.map(async (schedule) => {
          const response = await fetch(
            `/api/v1/exams/schedules/${schedule.id}/marks?sectionId=${encodeURIComponent(
              sectionId,
            )}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                marks: students.map((student) => {
                  const mark = student.marks[schedule.id];

                  return {
                    studentEnrollmentId: student.studentEnrollmentId,

                    marksObtained:
                      !mark ||
                      mark.status === "ABSENT" ||
                      mark.marksObtained === ""
                        ? null
                        : Number(mark.marksObtained),

                    status: mark?.status ?? "PRESENT",

                    remarks: mark?.remarks || null,
                  };
                }),
              }),
            },
          );

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.message ||
                `Failed to save ${schedule.subject.name} marks.`,
            );
          }
        }),
      );

      toast.success("Exam results saved successfully.");
      await loadStudents();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save exam results.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !examName) {
    return <div className="p-6">Loading exam...</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full flex-col gap-6 p-4 sm:p-5 lg:p-6">
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
            <h1 className="text-2xl font-semibold">
              {examName} — Enter Results
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter marks for all scheduled subjects.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={loading || saving}
            onClick={() => void loadStudents()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            disabled={saving || students.length === 0}
            onClick={() => void saveResults()}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Results"}
          </Button>
        </div>
      </div>

      <Card className="w-full rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-64">
              <ClassSelect
                value={selectedClassId}
                onChange={(value) => {
                  setSelectedClassId(value);
                  setSectionId("");
                  setStudents([]);
                }}
              />
            </div>

            <div className="w-full sm:w-64">
              <SectionSelect
                value={sectionId}
                onChange={(value) => {
                  setSectionId(value);
                  setStudents([]);
                }}
                classId={selectedClassId}
                disabled={!selectedClassId}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClassId || !sectionId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select class and section to enter exam results.
          </CardContent>
        </Card>
      ) : applicableSchedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No subjects are scheduled for this class and section.
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading students and marks...
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No students found for this class and section.
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full overflow-hidden rounded-2xl">
          <CardHeader className="border-b">
            <CardTitle>
              {students.length} Students · {applicableSchedules.length} Subjects
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-20 w-[64px] border-b border-r bg-muted/50 p-3 text-left">
                      R.No
                    </th>

                    <th className="sticky left-[64px] z-20 min-w-[220px] border-b border-r bg-muted/50 p-3 text-left">
                      Student Name
                    </th>

                    {applicableSchedules.map((schedule) => (
                      <th
                        key={schedule.id}
                        className="min-w-[170px] border-b border-r p-3 text-center last:border-r-0"
                      >
                        <div className="font-semibold">
                          {schedule.subject.name}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          / {Number(schedule.maxMarks)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.studentEnrollmentId} className="border-b">
                      <td className="sticky left-0 z-10 border-r bg-background p-3 font-semibold">
                        {student.rollNo ?? "—"}
                      </td>

                      <td className="sticky left-[64px] z-10 border-r bg-background p-3">
                        <div className="font-medium">
                          {student.student.fullName || "—"}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {student.student.admissionNo}
                        </div>
                      </td>

                      {applicableSchedules.map((schedule) => {
                        const mark = student.marks[schedule.id] ?? {
                          marksObtained: "",
                          status: "PRESENT" as Status,
                          remarks: "",
                        };

                        return (
                          <td key={schedule.id} className="border-r p-2">
                            <div className="flex min-w-[160px] flex-col gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={Number(schedule.maxMarks)}
                                step="0.01"
                                value={mark.marksObtained}
                                disabled={saving || mark.status === "ABSENT"}
                                onChange={(event) =>
                                  updateMark(
                                    student.studentEnrollmentId,
                                    schedule.id,
                                    event.target.value,
                                  )
                                }
                                placeholder="Marks"
                              />

                              <select
                                value={mark.status}
                                disabled={saving}
                                onChange={(event) =>
                                  updateStatus(
                                    student.studentEnrollmentId,
                                    schedule.id,
                                    event.target.value as Status,
                                  )
                                }
                                className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                              >
                                <option value="PRESENT">Present</option>

                                <option value="ABSENT">Absent</option>
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
