import { CalendarClock, ClipboardList, Clock3, Sparkles } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { studentExamService } from "@/features/exams/services/student-exam.service";
import { formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentExamsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const schedules = enrollment
    ? await studentExamService.listSchedule(membership.schoolId, enrollment)
    : [];
  const orderedSchedules = [...schedules].sort(
    (a, b) => a.examDate.getTime() - b.examDate.getTime(),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextExam = orderedSchedules.find((schedule) => schedule.examDate >= today);

  return (
    <SelfServicePage
      title="Exams"
      description="Published and completed examination schedules for the active enrollment."
    >
      {schedules.length ? (
        <>
          <section className="relative overflow-hidden rounded-[30px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/80 to-amber-100/70 p-6 text-slate-950 shadow-[0_26px_70px_rgba(79,70,229,0.1)] sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-amber-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-indigo-300/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700"><Sparkles className="size-4" />Next examination</p>
                <h3 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{nextExam?.subject.name || "Schedule complete"}</h3>
                <p className="mt-2 text-sm text-slate-600">{nextExam ? `${nextExam.exam.name} · ${formatDate(nextExam.examDate)}` : "There are no upcoming exams in the published schedule."}</p>
              </div>
              {nextExam && <div className="rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl"><p className="text-xs font-semibold text-slate-500">Exam time</p><p className="mt-1 text-xl font-black text-slate-950">{nextExam.startTime || "To be announced"}{nextExam.endTime ? ` – ${nextExam.endTime}` : ""}</p></div>}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {orderedSchedules.map((schedule) => (
              <article key={schedule.id} className="rounded-[24px] border border-border/60 bg-card/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.055)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <span className="text-[10px] font-black uppercase">{schedule.examDate.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}</span>
                      <span className="text-xl font-black leading-none">{schedule.examDate.getUTCDate()}</span>
                    </span>
                    <div>
                      <h3 className="font-black tracking-[-0.015em]">{schedule.subject.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{schedule.exam.name}</p>
                    </div>
                  </div>
                  <Badge variant={schedule.exam.status === "COMPLETED" ? "success" : "info"}>{schedule.exam.status}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4 text-primary" />{schedule.startTime || "Time pending"}{schedule.endTime ? ` – ${schedule.endTime}` : ""}</p>
                  <p className="flex items-center justify-end gap-2 font-semibold"><CalendarClock className="size-4 text-primary" />{Number(schedule.maxMarks)} marks</p>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <Card className="rounded-[26px] border-border/60 bg-card/90">
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={ClipboardList}
              title="No published exams"
              description="Exam schedules will appear here after publication."
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}
