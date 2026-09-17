"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, GraduationCap, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Exam = {
  id: string;
  name: string;
  academicYear: { id: string; name: string };
};

type ExamSchedule = {
  id: string;
  examDate: string;
  startTime: string | null;
  endTime: string | null;
  maxMarks: string | number;
  passMarks: string | number | null;
  class: { id: string; name: string };
  section: { id: string; name: string } | null;
  subject: { id: string; name: string; code: string | null };
};

type Props = { schoolSlug: string; examId: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ExamTimetablePage({ schoolSlug, examId }: Props) {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [examResponse, schedulesResponse] = await Promise.all([
          fetch(`/api/v1/exams/${examId}`, { cache: "no-store" }),
          fetch(`/api/v1/exams/${examId}/schedules`, { cache: "no-store" }),
        ]);
        const examResult = await examResponse.json();
        const schedulesResult = await schedulesResponse.json();
        if (cancelled) return;
        if (!examResponse.ok || !examResult.success) {
          toast.error(examResult.message || "Failed to load exam.");
          return;
        }
        if (!schedulesResponse.ok || !schedulesResult.success) {
          toast.error(schedulesResult.message || "Failed to load exam timetable.");
          return;
        }
        setExam(examResult.data);
        setSchedules(Array.isArray(schedulesResult.data) ? schedulesResult.data : []);
      } catch {
        if (!cancelled) toast.error("Failed to load exam timetable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const classes = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach((item) => map.set(item.class.id, item.class.name));
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [schedules]);

  const sections = useMemo(() => {
    if (!classId) return [];
    const map = new Map<string, string>();
    schedules
      .filter((item) => item.class.id === classId && item.section)
      .forEach((item) => {
        if (item.section) map.set(item.section.id, item.section.name);
      });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [classId, schedules]);

  const visibleSchedules = useMemo(() => {
    if (!classId) return [];
    return schedules
      .filter((item) => {
        if (item.class.id !== classId) return false;
        if (!sectionId) return true;
        return item.section?.id === sectionId || item.section === null;
      })
      .sort((a, b) => {
        const date = new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
        if (date !== 0) return date;
        return a.subject.name.localeCompare(b.subject.name);
      });
  }, [classId, sectionId, schedules]);

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-card">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Button variant="ghost" className="-ml-3" onClick={() => router.push(`/${schoolSlug}/exams/${examId}`)}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Exam
        </Button>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exam Timetable</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {exam?.name || "Exam"}{exam ? ` · ${exam.academicYear.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4">
          <h2 className="text-sm font-semibold">Schedule Workspace</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Choose a class and optionally a section to view its exam timetable.</p>
        </div>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold">Class</span>
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSectionId("");
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold">Section</span>
            <select
              value={sectionId}
              disabled={!classId || sections.length === 0}
              onChange={(event) => setSectionId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">All sections</option>
              {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </CardContent>
      </Card>

      {!classId ? (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="py-14 text-center">
            <GraduationCap className="mx-auto size-7 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">Select a class to continue</h3>
            <p className="mt-1 text-sm text-muted-foreground">The timetable will show only exam schedules for the selected class.</p>
          </CardContent>
        </Card>
      ) : visibleSchedules.length === 0 ? (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="py-14 text-center">
            <CalendarDays className="mx-auto size-7 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No exam schedules</h3>
            <p className="mt-1 text-sm text-muted-foreground">No schedules exist for the selected class and section.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="border-b bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-semibold">Exam Schedule</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{visibleSchedules.length} scheduled subject{visibleSchedules.length === 1 ? "" : "s"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Subject</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Section</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Time</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold">Max Marks</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-4 font-medium">{formatDate(schedule.examDate)}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{schedule.subject.name}</p>
                      {schedule.subject.code && <p className="text-xs text-muted-foreground">{schedule.subject.code}</p>}
                    </td>
                    <td className="px-5 py-4">{schedule.section?.name || "All sections"}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5 text-muted-foreground" />
                        {schedule.startTime && schedule.endTime
                          ? `${schedule.startTime} - ${schedule.endTime}`
                          : schedule.startTime || "Time not set"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">{Number(schedule.maxMarks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
