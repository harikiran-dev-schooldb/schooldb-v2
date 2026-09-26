import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  BusFront,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FolderLock,
  IndianRupee,
  LibraryBig,
  ScrollText,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { listVisibleCalendarEvents } from "@/features/calendar/service";
import { studentExamService } from "@/features/exams/services/student-exam.service";
import { homeworkService } from "@/features/homework/services/homework.service";
import { studentFeeLedgerService } from "@/features/student-fees/services/student-fee-ledger.service";
import { studentFeeService } from "@/features/student-fees/services/student-fee.service";
import { formatCurrency } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

const modules = [
  { href: "attendance", title: "Attendance", description: "Daily record and percentage", icon: CalendarCheck2, iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { href: "fees", title: "Fees", description: "Payments and installments", icon: CreditCard, iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { href: "homework", title: "Homework", description: "Assignments and due dates", icon: BookOpenCheck, iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { href: "timetable", title: "Timetable", description: "Weekly class schedule", icon: CalendarDays, iconClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { href: "exams", title: "Exams", description: "Dates, subjects and times", icon: ClipboardList, iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { href: "results", title: "Results", description: "Marks and performance", icon: Trophy, iconClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { href: "report-card", title: "Report card", description: "Complete academic summary", icon: ScrollText, iconClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { href: "leave-requests", title: "Leave", description: "Request and track leave", icon: CalendarClock, iconClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { href: "transport", title: "Transport", description: "Route and boarding details", icon: BusFront, iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { href: "library", title: "Library", description: "Borrowed books and returns", icon: LibraryBig, iconClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
  { href: "documents", title: "Documents", description: "Secure school records", icon: FolderLock, iconClass: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
];

function dayGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  ) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function dateLabel(value: Date | null | undefined) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

export default async function StudentOverviewPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, student, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const base = `/${schoolSlug}/my/${studentId}`;
  const firstName = (student.fullName || "Student").split(" ")[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const feeSummaryPromise = (async () => {
    const assignments = await studentFeeService.list(membership.schoolId, studentId);
    const ledgers = (
      await Promise.all(
        assignments.map((assignment) =>
          studentFeeLedgerService.get(assignment.id, membership.schoolId),
        ),
      )
    ).filter((ledger) => ledger !== null);

    return ledgers.reduce(
      (summary, ledger) => ({
        outstanding: summary.outstanding + ledger.summary.outstanding,
        paid: summary.paid + ledger.summary.paid,
      }),
      { outstanding: 0, paid: 0 },
    );
  })();

  const [attendance, homework, exams, events, feeSummary] = await Promise.all([
    enrollment
      ? attendanceService.studentAttendanceReport(
          membership.schoolId,
          studentId,
          enrollment.academicYearId,
        )
      : null,
    enrollment ? homeworkService.studentList(membership.schoolId, enrollment) : [],
    enrollment ? studentExamService.listSchedule(membership.schoolId, enrollment) : [],
    listVisibleCalendarEvents(schoolSlug),
    feeSummaryPromise,
  ]);

  const activeHomework = homework
    .filter((item) => !item.dueDate || item.dueDate >= today)
    .sort((a, b) => (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER));
  const upcomingExams = exams
    .filter((exam) => exam.examDate >= today)
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime());
  const upcomingEvents = events
    .filter((event) => event.endDate >= today)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const attendancePercentage = attendance?.summary.attendancePercentage ?? 0;
  const nextExam = upcomingExams[0];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[#080b16] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-indigo-100 backdrop-blur-xl">
              <Sparkles className="size-3.5" />
              {enrollment?.academicYear.name || "Student workspace"}
            </div>
            <h1 className="mt-5 max-w-2xl text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:text-5xl">
              {dayGreeting()}, {firstName}.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
              {enrollment
                ? `${enrollment.class.name}, Section ${enrollment.section.name}. Here is what needs your attention today.`
                : "Your active enrollment will appear here once it is assigned."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`${base}/homework`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-indigo-50">
                View homework <ArrowRight className="size-4" />
              </Link>
              <Link href={`${base}/timetable`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/15">
                Today&apos;s timetable
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl sm:min-w-64">
            <div
              className="grid size-20 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(#818cf8 ${Math.min(attendancePercentage, 100) * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}
            >
              <div className="grid size-16 place-items-center rounded-full bg-[#111525]">
                <span className="text-xl font-black">{attendancePercentage}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Attendance</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {attendance?.summary.total ? `${attendance.summary.present} of ${attendance.summary.total} present` : "No sessions yet"}
              </p>
              <Link href={`${base}/attendance`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-300">
                Open record <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Student summary">
        <SummaryCard label="Attendance" value={`${attendancePercentage}%`} note={`${attendance?.summary.total ?? 0} sessions`} icon={CalendarCheck2} className="text-emerald-600 dark:text-emerald-400" />
        <SummaryCard label="Homework" value={String(activeHomework.length)} note="active assignments" icon={BookOpenCheck} className="text-violet-600 dark:text-violet-400" />
        <SummaryCard label="Fee balance" value={formatCurrency(feeSummary.outstanding)} note={feeSummary.outstanding > 0 ? "payment pending" : "all cleared"} icon={IndianRupee} className="text-blue-600 dark:text-blue-400" />
        <SummaryCard label="Next exam" value={nextExam ? dateLabel(nextExam.examDate) : "None"} note={nextExam?.subject.name || "no exam scheduled"} icon={ClipboardList} className="text-amber-600 dark:text-amber-400" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-black tracking-[-0.025em]">Homework</p>
              <p className="mt-1 text-sm text-muted-foreground">Your nearest assignments and deadlines</p>
            </div>
            <Link href={`${base}/homework`} className="text-sm font-bold text-primary">View all</Link>
          </div>

          <div className="mt-5 space-y-3">
            {activeHomework.slice(0, 3).map((item) => (
              <Link key={item.id} href={`${base}/homework`} className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/25 hover:bg-primary/[0.03]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <BookOpenCheck className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{item.title}</p>
                    <Badge variant="outline" className="hidden rounded-full sm:inline-flex">{item.subject?.name || "General"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Due {dateLabel(item.dueDate)}</p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
            {activeHomework.length === 0 && (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 p-6 text-center">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><BookOpenCheck className="size-5" /></span>
                <p className="mt-3 font-bold">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-muted-foreground">New homework will appear here.</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-black tracking-[-0.025em]">Coming up</p>
              <p className="mt-1 text-sm text-muted-foreground">Exams and school events</p>
            </div>
            <Link href={`/${schoolSlug}/my/calendar`} className="text-sm font-bold text-primary">Calendar</Link>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingExams.slice(0, 2).map((exam) => (
              <UpcomingItem key={exam.id} date={exam.examDate} title={exam.subject.name} meta={exam.exam.name} tone="violet" />
            ))}
            {upcomingEvents.slice(0, Math.max(0, 3 - upcomingExams.slice(0, 2).length)).map((event) => (
              <UpcomingItem key={event.id} date={event.startDate} title={event.title} meta={event.category.replaceAll("_", " ")} tone="blue" />
            ))}
            {upcomingExams.length === 0 && upcomingEvents.length === 0 && (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 p-6 text-center text-sm text-muted-foreground">
                Nothing scheduled yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-black tracking-[-0.03em]">School tools</p>
            <p className="mt-1 text-sm text-muted-foreground">Everything for this student, organized in one place</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map(({ href, title, description, icon: Icon, iconClass }) => (
            <Link key={href} href={`${base}/${href}`} className="group flex min-h-28 items-center gap-4 rounded-[22px] border border-border/60 bg-card/90 p-4 shadow-[0_12px_35px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_42px_rgba(79,70,229,0.1)]">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold tracking-[-0.01em]">{title}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, note, icon: Icon, className }: { label: string; value: string; note: string; icon: typeof CalendarCheck2; className: string }) {
  return (
    <article className="rounded-[22px] border border-border/60 bg-card/90 p-4 shadow-[0_12px_35px_rgba(15,23,42,0.045)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${className}`} />
      </div>
      <p className="mt-4 truncate text-xl font-black tracking-[-0.035em] sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function UpcomingItem({ date, title, meta, tone }: { date: Date; title: string; meta: string; tone: "violet" | "blue" }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
      <span className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl ${tone === "violet" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
        <span className="text-[10px] font-black uppercase">{date.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}</span>
        <span className="text-lg font-black leading-none">{date.getUTCDate()}</span>
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold">{title}</p>
        <p className="mt-1 truncate text-sm capitalize text-muted-foreground">{meta.toLowerCase()}</p>
      </div>
    </article>
  );
}
