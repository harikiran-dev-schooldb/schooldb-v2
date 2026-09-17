"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardPenLine,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  ClipboardEdit,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EditExamScheduleDialog } from "@/features/exams/components/EditExamScheduleDialog";
import { CreateExamScheduleDialog } from "./CreateExamScheduleDialog";
import { ExamStatusControl } from "./ExamStatusControl";

type Exam = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
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

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("active") || normalized.includes("ongoing")) return "border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300";
  if (normalized.includes("complete") || normalized.includes("closed")) return "border-muted-foreground/15 bg-muted text-muted-foreground";
  return "border-blue-500/15 bg-blue-500/[0.08] text-blue-700 dark:text-blue-300";
}

export function ExamDetailsPage({ schoolSlug, examId }: Props) {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [deleteScheduleOpen, setDeleteScheduleOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [examResponse, schedulesResponse] = await Promise.all([
        fetch(`/api/v1/exams/${examId}`, { cache: "no-store" }),
        fetch(`/api/v1/exams/${examId}/schedules`, { cache: "no-store" }),
      ]);
      const examResult = await examResponse.json();
      const schedulesResult = await schedulesResponse.json();
      if (!examResponse.ok || !examResult.success) { toast.error(examResult.message || "Failed to load exam."); return; }
      if (!schedulesResponse.ok || !schedulesResult.success) { toast.error(schedulesResult.message || "Failed to load exam schedules."); return; }
      setExam(examResult.data);
      setSchedules(Array.isArray(schedulesResult.data) ? schedulesResult.data : []);
    } catch (error) {
      console.error("Failed to load exam details:", error);
      toast.error("Failed to load exam details.");
    } finally { setLoading(false); }
  }, [examId]);

  function handleEditSchedule(schedule: ExamSchedule) { setSelectedSchedule(schedule); setEditScheduleOpen(true); }
  function handleDeleteSchedule(schedule: ExamSchedule) { setScheduleToDelete(schedule); setDeleteScheduleOpen(true); }

  async function confirmDeleteSchedule() {
    if (!scheduleToDelete) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/v1/exams/${examId}/schedules/${scheduleToDelete.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) { toast.error(result.message || "Failed to delete exam schedule."); return; }
      toast.success("Exam schedule deleted successfully.");
      setDeleteScheduleOpen(false); setScheduleToDelete(null); await loadData();
    } catch (error) { console.error("Delete exam schedule error:", error); toast.error("Failed to delete exam schedule."); }
    finally { setDeleting(false); }
  }

  useEffect(() => { const timeoutId = window.setTimeout(() => void loadData(), 0); return () => window.clearTimeout(timeoutId); }, [loadData]);

  const totalClasses = useMemo(() => new Set(schedules.map((s) => s.class.id)).size, [schedules]);
  const totalSubjects = useMemo(() => new Set(schedules.map((s) => s.subject.id)).size, [schedules]);
  const totalSections = useMemo(() => new Set(schedules.map((s) => s.section?.id).filter(Boolean)).size, [schedules]);

  if (loading) return <div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded-lg bg-muted" /><div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map((item)=><Card key={item} className="rounded-2xl border-border/60"><CardContent className="p-5"><div className="h-4 w-24 animate-pulse rounded bg-muted"/><div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted"/></CardContent></Card>)}</div></div>;
  if (!exam) return <Card className="rounded-2xl border-border/60"><CardContent className="flex flex-col items-center py-16 text-center"><ClipboardList className="size-6 text-muted-foreground"/><h2 className="mt-4 font-semibold">Exam not found</h2><Button variant="outline" className="mt-5 rounded-xl" onClick={()=>router.push(`/${schoolSlug}/exams`)}><ArrowLeft className="mr-2 size-4"/>Back to Exams</Button></CardContent></Card>;

  return <div className="space-y-8">
    <div className="space-y-5">
      <button type="button" onClick={()=>router.push(`/${schoolSlug}/exams`)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4"/>Back to Exams</button>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Examination</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(exam.status)}`}>{exam.status}</span></div><h1 className="mt-3 text-3xl font-bold tracking-tight">{exam.name}</h1><p className="mt-1.5 text-sm text-muted-foreground">Academic Year {exam.academicYear.name}</p></div>
        <div className="flex flex-wrap gap-2">
          <ExamStatusControl examId={examId} examName={exam.name} status={exam.status} onUpdated={loadData}/>
          <Button variant="outline" className="rounded-xl" onClick={()=>void loadData()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>
          <Button variant="outline" onClick={()=>router.push(`/${schoolSlug}/exams/${examId}/timetable`)}><CalendarDays className="mr-2 h-4 w-4"/>View Timetable</Button>
          <Button variant="outline" onClick={()=>router.push(`/${schoolSlug}/exams/${examId}/marks`)}><ClipboardEdit className="mr-2 h-4 w-4"/>Enter Results</Button>
          <Button variant="outline" onClick={()=>router.push(`/${schoolSlug}/exams/${examId}/results`)}><BarChart3 className="mr-2 h-4 w-4"/>Results</Button>
        </div>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Schedules",schedules.length,<ClipboardList key="i" className="size-5"/>],["Subjects",totalSubjects,<ClipboardPenLine key="i" className="size-5"/>],["Classes",totalClasses,<Users key="i" className="size-5"/>],["Sections",totalSections,<CheckCircle2 key="i" className="size-5"/>]].map(([label,value,icon])=><Card key={String(label)} className="rounded-2xl border-border/60 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div><div className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">{icon}</div></div></CardContent></Card>)}
    </div>

    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm"><div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400"/><CardContent className="p-6"><div className="flex items-center gap-3"><CalendarDays className="size-5 text-primary"/><div><h2 className="font-semibold">Examination Period</h2><p className="text-xs text-muted-foreground">Scheduled examination window</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Start Date",formatDate(exam.startDate)],["End Date",formatDate(exam.endDate)],["Status",exam.status]].map(([label,value])=><div key={label} className="rounded-xl border border-border/60 bg-muted/[0.3] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div></CardContent></Card>

    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary"/><h2 className="font-semibold">Exam Schedule</h2><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{schedules.length}</span></div><p className="mt-1 text-xs text-muted-foreground">Manage subjects, classes, dates and marks.</p></div><Button variant="outline" size="sm" className="rounded-xl" onClick={()=>setScheduleOpen(true)}><Plus className="mr-2 size-3.5"/>Add Schedule</Button></div>
      {schedules.length===0 ? <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><CalendarDays className="size-6 text-primary"/><h3 className="mt-4 font-semibold">No schedules yet</h3><Button className="mt-5 rounded-xl" onClick={()=>setScheduleOpen(true)}><Plus className="mr-2 size-4"/>Add First Schedule</Button></div> : <>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full text-sm"><thead><tr className="border-b border-border/60 bg-muted/[0.3]"><th className="px-6 py-3 text-left">Class</th><th className="px-4 py-3 text-left">Subject</th><th className="px-4 py-3 text-left">Date & Time</th><th className="px-4 py-3 text-right">Marks</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{schedules.map((schedule)=><tr key={schedule.id} className="border-b border-border/50 last:border-0"><td className="px-6 py-4"><div className="font-semibold">{schedule.class.name}</div><div className="text-xs text-muted-foreground">{schedule.section?.name||"All sections"}</div></td><td className="px-4 py-4 font-semibold">{schedule.subject.name}</td><td className="px-4 py-4"><div>{formatDate(schedule.examDate)}</div><div className="text-xs text-muted-foreground">{schedule.startTime&&schedule.endTime?`${schedule.startTime} - ${schedule.endTime}`:schedule.startTime||"Time not set"}</div></td><td className="px-4 py-4 text-right">{Number(schedule.maxMarks)}</td><td className="px-6 py-4"><div className="flex justify-end gap-1.5"><Button size="sm" onClick={()=>router.push(`/${schoolSlug}/exams/${examId}/schedules/${schedule.id}/marks`)}><ClipboardPenLine className="mr-1.5 size-3.5"/>Marks</Button><Button variant="outline" size="icon-sm" onClick={()=>handleEditSchedule(schedule)}><Pencil className="size-3.5"/></Button><Button variant="outline" size="icon-sm" onClick={()=>handleDeleteSchedule(schedule)}><Trash2 className="size-3.5"/></Button></div></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-border/50 lg:hidden">{schedules.map((schedule)=><div key={schedule.id} className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{schedule.class.name} • {schedule.section?.name||"All sections"}</p><h3 className="mt-1 font-semibold">{schedule.subject.name}</h3></div><MoreHorizontal className="size-4"/></div><div className="mt-3 text-sm">{formatDate(schedule.examDate)} · {Number(schedule.maxMarks)} marks</div><div className="mt-4 flex gap-2"><Button className="flex-1" onClick={()=>router.push(`/${schoolSlug}/exams/${examId}/schedules/${schedule.id}/marks`)}><ClipboardPenLine className="mr-2 size-4"/>Enter Marks</Button><Button variant="outline" size="icon" onClick={()=>handleEditSchedule(schedule)}><Pencil className="size-4"/></Button><Button variant="outline" size="icon" onClick={()=>handleDeleteSchedule(schedule)}><Trash2 className="size-4"/></Button></div></div>)}</div>
      </>}
    </Card>

    <CreateExamScheduleDialog academicYearId={exam.academicYear.id} open={scheduleOpen} onOpenChange={setScheduleOpen} examId={examId} schoolSlug={schoolSlug} startDate={exam.startDate} endDate={exam.endDate} onSuccess={()=>void loadData()}/>
    <EditExamScheduleDialog open={editScheduleOpen} onOpenChange={setEditScheduleOpen} examId={examId} schedule={selectedSchedule} startDate={exam.startDate} endDate={exam.endDate} onSuccess={()=>void loadData()}/>
    <AlertDialog open={deleteScheduleOpen} onOpenChange={(open)=>{if(deleting)return;setDeleteScheduleOpen(open);if(!open)setScheduleToDelete(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Exam Schedule?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this exam schedule? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={(event)=>{event.preventDefault();void confirmDeleteSchedule();}}>{deleting?"Deleting...":"Delete Schedule"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
