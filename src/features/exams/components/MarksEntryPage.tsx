"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StudentExamStatus = "PRESENT" | "ABSENT";

type StudentMark = {
  id: string | null;
  marksObtained: string | number | null;
  status: StudentExamStatus;
  remarks: string | null;
};

type StudentRow = {
  studentEnrollmentId: string;

  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
  };

  mark: StudentMark;
};

type ScheduleData = {
  id: string;
  examId: string;
  examName: string;
  academicYear: string;

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

  examDate: string;
  maxMarks: string | number;
  passMarks: string | number | null;
};

type MarksData = {
  schedule: ScheduleData;
  students: StudentRow[];
};

type Props = {
  schoolSlug: string;
  examId: string;
  scheduleId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function MarksEntryPage({ schoolSlug, examId, scheduleId }: Props) {
  const router = useRouter();

  const [data, setData] = useState<MarksData | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* LOAD DATA                                                              */
  /* ---------------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/exams/schedules/${scheduleId}/marks`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load marks.");
        return;
      }

      setData(result.data);

      setStudents(
        Array.isArray(result.data.students) ? result.data.students : [],
      );
    } catch (error) {
      console.error("Failed to load marks:", error);

      toast.error("Failed to load student marks.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  /* ---------------------------------------------------------------------- */
  /* UPDATE MARK                                                            */
  /* ---------------------------------------------------------------------- */

  function updateMarks(studentEnrollmentId: string, value: string) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              mark: {
                ...student.mark,
                marksObtained: value === "" ? null : value,
              },
            }
          : student,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UPDATE STATUS                                                          */
  /* ---------------------------------------------------------------------- */

  function updateStatus(
    studentEnrollmentId: string,
    status: StudentExamStatus,
  ) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              mark: {
                ...student.mark,
                status,
                marksObtained:
                  status === "ABSENT" ? null : student.mark.marksObtained,
              },
            }
          : student,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UPDATE REMARKS                                                         */
  /* ---------------------------------------------------------------------- */

  function updateRemarks(studentEnrollmentId: string, remarks: string) {
    setStudents((current) =>
      current.map((student) =>
        student.studentEnrollmentId === studentEnrollmentId
          ? {
              ...student,
              mark: {
                ...student.mark,
                remarks: remarks || null,
              },
            }
          : student,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* SAVE                                                                   */
  /* ---------------------------------------------------------------------- */

  async function saveMarks() {
    if (!data) return;

    const maxMarks = Number(data.schedule.maxMarks);

    for (const student of students) {
      if (student.mark.status === "ABSENT") continue;

      if (
        student.mark.marksObtained !== null &&
        student.mark.marksObtained !== ""
      ) {
        const marks = Number(student.mark.marksObtained);

        if (!Number.isFinite(marks)) {
          toast.error(
            `Invalid marks for ${student.student.fullName || student.student.admissionNo}.`,
          );
          return;
        }

        if (marks < 0 || marks > maxMarks) {
          toast.error(
            `Marks for ${student.student.fullName || student.student.admissionNo} must be between 0 and ${maxMarks}.`,
          );
          return;
        }
      }
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/v1/exams/schedules/${scheduleId}/marks`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            marks: students.map((student) => ({
              studentEnrollmentId: student.studentEnrollmentId,

              marksObtained:
                student.mark.status === "ABSENT"
                  ? null
                  : student.mark.marksObtained === null ||
                      student.mark.marksObtained === ""
                    ? null
                    : Number(student.mark.marksObtained),

              status: student.mark.status,

              remarks: student.mark.remarks || null,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to save marks.");
        return;
      }

      toast.success("Student marks saved successfully.");

      await loadData();
    } catch (error) {
      console.error("Save marks error:", error);

      toast.error("Failed to save student marks.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return <div className="p-6">Loading marks...</div>;
  }

  if (!data) {
    return (
      <div className="space-y-4 p-6">
        <p>Marks data not found.</p>

        <Button
          variant="outline"
          onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}
        >
          Back to Exam
        </Button>
      </div>
    );
  }

  const { schedule } = data;

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">Enter Marks</h1>

            <p className="text-sm text-muted-foreground">
              {schedule.examName} • {schedule.academicYear}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => void loadData()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button disabled={saving} onClick={() => void saveMarks()}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Marks"}
          </Button>
        </div>
      </div>

      {/* Schedule Information */}

      <Card>
        <CardHeader>
          <CardTitle>Schedule Information</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm text-muted-foreground">Class</div>

            <div className="font-medium">
              {schedule.class.name}
              {schedule.section ? ` - ${schedule.section.name}` : ""}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Subject</div>

            <div className="font-medium">
              {schedule.subject.name}

              {schedule.subject.code && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({schedule.subject.code})
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Exam Date</div>

            <div className="font-medium">{formatDate(schedule.examDate)}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Maximum Marks</div>

            <div className="font-medium">{Number(schedule.maxMarks)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Student Marks */}

      <Card>
        <CardHeader>
          <CardTitle>Student Marks ({students.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {students.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No students found for this class and section.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">#</th>

                    <th className="p-3">Admission No.</th>

                    <th className="p-3">Student Name</th>

                    <th className="min-w-[130px] p-3">Marks</th>

                    <th className="min-w-[130px] p-3">Status</th>

                    <th className="min-w-[200px] p-3">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.studentEnrollmentId} className="border-b">
                      <td className="p-3">{index + 1}</td>

                      <td className="p-3 font-medium">
                        {student.student.admissionNo}
                      </td>

                      <td className="p-3">{student.student.fullName || "—"}</td>

                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          max={Number(schedule.maxMarks)}
                          step="0.01"
                          value={
                            student.mark.marksObtained === null
                              ? ""
                              : student.mark.marksObtained
                          }
                          disabled={saving || student.mark.status === "ABSENT"}
                          onChange={(event) =>
                            updateMarks(
                              student.studentEnrollmentId,
                              event.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="p-3">
                        <select
                          value={student.mark.status}
                          disabled={saving}
                          onChange={(event) =>
                            updateStatus(
                              student.studentEnrollmentId,
                              event.target.value as StudentExamStatus,
                            )
                          }
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="PRESENT">Present</option>

                          <option value="ABSENT">Absent</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <Input
                          placeholder="Remarks"
                          value={student.mark.remarks || ""}
                          disabled={saving}
                          onChange={(event) =>
                            updateRemarks(
                              student.studentEnrollmentId,
                              event.target.value,
                            )
                          }
                        />
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
