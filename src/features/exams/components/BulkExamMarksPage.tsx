"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClassSelect, SectionSelect } from "@/components/common/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Status = "PRESENT" | "ABSENT" | "EXEMPTED";

type Schedule = {
  id: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  examDate: string;
  maxMarks: string | number;
  subject: { id: string; name: string; code: string | null };
};

type MarkValue = {
  marksObtained: string;
  status: Status;
  remarks: string;
};

type Student = {
  studentEnrollmentId: string;
  rollNo: string | number | null;
  student: { id: string; admissionNo: string; fullName: string | null };
  marks: Record<string, MarkValue>;
};

type Props = { schoolSlug: string; examId: string };

export function BulkExamMarksPage({ schoolSlug, examId }: Props) {
  const router = useRouter();
  const [examName, setExamName] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadExam = useCallback(async () => {
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
        throw new Error(schedulesResult.message || "Failed to load exam schedules.");
      }
      setExamName(examResult.data.name);
      setSchedules(Array.isArray(schedulesResult.data) ? schedulesResult.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load exam.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const subjects = useMemo(() => {
    if (!classId) return [];
    const matching = schedules.filter((schedule) => schedule.classId === classId);
    if (!sectionId) return matching;
    const sectionSpecific = matching.filter((schedule) => schedule.sectionId === sectionId);
    const allSections = matching.filter((schedule) => schedule.sectionId === null);
    const specificSubjects = new Set(sectionSpecific.map((schedule) => schedule.subjectId));
    return [...sectionSpecific, ...allSections.filter((schedule) => !specificSubjects.has(schedule.subjectId))]
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  }, [classId, schedules, sectionId]);

  const loadStudents = useCallback(async () => {
    if (!classId || !sectionId || subjects.length === 0) {
      setStudents([]);
      return;
    }
    try {
      setLoading(true);
      const responses = await Promise.all(
        subjects.map(async (schedule) => {
          const response = await fetch(
            `/api/v1/exams/schedules/${schedule.id}/marks?sectionId=${encodeURIComponent(sectionId)}`,
            { cache: "no-store" },
          );
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || `Failed to load ${schedule.subject.name}.`);
          }
          return { schedule, data: result.data };
        }),
      );

      const studentMap = new Map<string, Student>();
      for (const { schedule, data } of responses) {
        for (const row of data.students ?? []) {
          const student: Student = studentMap.get(row.studentEnrollmentId) ?? {
            studentEnrollmentId: row.studentEnrollmentId,
            rollNo: row.rollNo,
            student: row.student,
            marks: {},
          };
          student.marks[schedule.id] = {
            marksObtained: row.mark?.marksObtained == null ? "" : String(row.mark.marksObtained),
            status: row.mark?.status ?? "PRESENT",
            remarks: row.mark?.remarks ?? "",
          };
          studentMap.set(row.studentEnrollmentId, student);
        }
      }
      setStudents(
        [...studentMap.values()].sort((a, b) => {
          const aRoll = a.rollNo == null ? Number.MAX_SAFE_INTEGER : Number(a.rollNo);
          const bRoll = b.rollNo == null ? Number.MAX_SAFE_INTEGER : Number(b.rollNo);
          return aRoll - bRoll || a.student.admissionNo.localeCompare(b.student.admissionNo);
        }),
      );
    } catch (error) {
      setStudents([]);
      toast.error(error instanceof Error ? error.message : "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, subjects]);

  useEffect(() => {
    // Initial exam metadata fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadExam();
  }, [loadExam]);
  useEffect(() => {
    // Reload marks whenever the selected class/section schedules change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStudents();
  }, [loadStudents]);

  function updateMark(studentEnrollmentId: string, scheduleId: string, value: string) {
    setStudents((current) => current.map((student) =>
      student.studentEnrollmentId === studentEnrollmentId
        ? { ...student, marks: { ...student.marks, [scheduleId]: { ...student.marks[scheduleId], marksObtained: value } } }
        : student,
    ));
  }

  function updateStatus(studentEnrollmentId: string, scheduleId: string, status: Status) {
    setStudents((current) => current.map((student) =>
      student.studentEnrollmentId === studentEnrollmentId
        ? {
            ...student,
            marks: {
              ...student.marks,
              [scheduleId]: {
                ...(student.marks[scheduleId] ?? { marksObtained: "", remarks: "" }),
                status,
                marksObtained: status !== "PRESENT" ? "" : student.marks[scheduleId]?.marksObtained ?? "",
              },
            },
          }
        : student,
    ));
  }

  async function saveResults() {
    if (!students.length || !subjects.length) return;
    for (const schedule of subjects) {
      const maxMarks = Number(schedule.maxMarks);
      for (const student of students) {
        const mark = student.marks[schedule.id];
        if (!mark || mark.status !== "PRESENT" || mark.marksObtained === "") continue;
        const value = Number(mark.marksObtained);
        if (!Number.isFinite(value) || value < 0 || value > maxMarks) {
          toast.error(`${student.student.admissionNo} · ${schedule.subject.name}: marks must be between 0 and ${maxMarks}.`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      await Promise.all(subjects.map(async (schedule) => {
        const response = await fetch(
          `/api/v1/exams/schedules/${schedule.id}/marks?sectionId=${encodeURIComponent(sectionId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              marks: students.map((student) => {
                const mark = student.marks[schedule.id];
                return {
                  studentEnrollmentId: student.studentEnrollmentId,
                  marksObtained: !mark || mark.status !== "PRESENT" || mark.marksObtained === "" ? null : Number(mark.marksObtained),
                  status: mark?.status ?? "PRESENT",
                  remarks: mark?.remarks || null,
                };
              }),
            }),
          },
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || `Failed to save ${schedule.subject.name}.`);
        }
      }));
      toast.success("Bulk exam results saved successfully.");
      await loadStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save results.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !examName) return <div className="p-6">Loading exam...</div>;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full flex-col gap-6 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Bulk Results Entry</h1>
            <p className="text-sm text-muted-foreground">{examName || "Exam"} · Select class and section to enter all subject marks.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={loading || saving || !sectionId} onClick={() => void loadStudents()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button disabled={saving || students.length === 0} onClick={() => void saveResults()}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save All Results"}
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div><div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Exam</div><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">{examName || "—"}</div></div>
            <div><div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Class</div><ClassSelect value={classId} onChange={(value) => { setClassId(value); setSectionId(""); setStudents([]); }} /></div>
            <div><div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Section</div><SectionSelect classId={classId} value={sectionId} disabled={!classId} onChange={(value) => { setSectionId(value); setStudents([]); }} /></div>
          </div>
        </CardContent>
      </Card>

      {!classId || !sectionId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a class and section. Admission numbers, students and scheduled subjects will load automatically.</CardContent></Card>
      ) : subjects.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No exam subjects are scheduled for this class and section.</CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading students and existing marks...</CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No active students found for this class and section.</CardContent></Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="border-b py-4"><CardTitle className="text-base">{examName} · {students.length} Students · {subjects.length} Subjects</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead><tr className="bg-muted/50">
                  <th className="sticky left-0 z-20 w-[70px] border-b border-r bg-muted/50 p-3 text-left">R.No</th>
                  <th className="sticky left-[70px] z-20 min-w-[130px] border-b border-r bg-muted/50 p-3 text-left">Adm No.</th>
                  <th className="sticky left-[200px] z-20 min-w-[210px] border-b border-r bg-muted/50 p-3 text-left">Student Name</th>
                  {subjects.map((schedule) => <th key={schedule.id} className="min-w-[145px] border-b border-r p-3 text-center"><div className="font-semibold">{schedule.subject.name}</div><div className="mt-1 text-xs text-muted-foreground">Max {Number(schedule.maxMarks)}</div></th>)}
                </tr></thead>
                <tbody>{students.map((student) => <tr key={student.studentEnrollmentId} className="border-b hover:bg-muted/20">
                  <td className="sticky left-0 z-10 border-r bg-background p-3 font-semibold">{student.rollNo ?? "—"}</td>
                  <td className="sticky left-[70px] z-10 border-r bg-background p-3 font-medium">{student.student.admissionNo}</td>
                  <td className="sticky left-[200px] z-10 border-r bg-background p-3">{student.student.fullName || "—"}</td>
                  {subjects.map((schedule) => {
                    const mark = student.marks[schedule.id] ?? { marksObtained: "", status: "PRESENT" as Status, remarks: "" };
                    return <td key={schedule.id} className="border-r p-2"><div className="flex min-w-[125px] gap-2">
                      <Input type="number" min="0" max={Number(schedule.maxMarks)} step="0.01" value={mark.marksObtained} disabled={saving || mark.status !== "PRESENT"} onChange={(event) => updateMark(student.studentEnrollmentId, schedule.id, event.target.value)} placeholder="Marks" className="w-20" />
                      <Button
                      type="button"
                      variant={mark.status === "ABSENT" ? "destructive" : mark.status === "EXEMPTED" ? "secondary" : "outline"}
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        const nextStatus: Status =
                          mark.status === "PRESENT"
                            ? "ABSENT"
                            : mark.status === "ABSENT"
                              ? "EXEMPTED"
                              : "PRESENT";
                        updateStatus(student.studentEnrollmentId, schedule.id, nextStatus);
                      }}
                      title="Cycle Present / Absent / Exempted"
                    >
                      {mark.status === "ABSENT" ? "AB" : mark.status === "EXEMPTED" ? "EX" : "P"}
                    </Button>
                    </div></td>;
                  })}
                </tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
