import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  LockKeyhole,
  Megaphone,
  MonitorPlay,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const capabilityCopy = [
  {
    title: "Admissions & student records",
    description:
      "Move from enquiry and admission to enrollment, documents and the complete student lifecycle.",
    icon: GraduationCap,
  },
  {
    title: "Attendance & intervention",
    description:
      "Record daily attendance, identify trends and follow up before absence becomes a learning gap.",
    icon: CalendarCheck2,
  },
  {
    title: "Learning & examinations",
    description:
      "Coordinate homework, exam schedules, marks, report cards and academic progress in one flow.",
    icon: BookOpenCheck,
  },
  {
    title: "Fees & finance",
    description:
      "Configure fee plans, track dues, collect payments and issue permission-checked receipts.",
    icon: IndianRupee,
  },
  {
    title: "Family communication",
    description:
      "Publish notices and keep opted-in families informed through the portal and configured channels.",
    icon: Megaphone,
  },
  {
    title: "Reports & accountability",
    description:
      "Give administrators a current operational view with private exports and auditable actions.",
    icon: ClipboardList,
  },
] as const;

export default async function PresentationModePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const schoolId = membership.schoolId;
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });
  const academicYearId = academicYear?.id;

  const [
    activeStudents,
    activeTeachers,
    activeClasses,
    activeSections,
    attendanceSessions,
    homeworkItems,
    examinations,
    feeAssignments,
    successfulPayments,
    announcements,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.teacher.count({ where: { schoolId, active: true } }),
    prisma.class.count({ where: { schoolId, active: true } }),
    prisma.section.count({
      where: { active: true, class: { schoolId, active: true } },
    }),
    academicYearId
      ? prisma.attendanceSession.count({
          where: { schoolId, academicYearId },
        })
      : Promise.resolve(0),
    academicYearId
      ? prisma.homework.count({
          where: { schoolId, academicYearId, active: true },
        })
      : Promise.resolve(0),
    academicYearId
      ? prisma.exam.count({
          where: { schoolId, academicYearId, active: true },
        })
      : Promise.resolve(0),
    academicYearId
      ? prisma.studentFee.count({
          where: {
            schoolId,
            active: true,
            studentEnrollment: { academicYearId, active: true },
          },
        })
      : Promise.resolve(0),
    academicYearId
      ? prisma.feePayment.count({
          where: {
            schoolId,
            status: "SUCCESS",
            studentEnrollment: { academicYearId, active: true },
          },
        })
      : Promise.resolve(0),
    prisma.announcement.count({
      where: { schoolId, archived: false },
    }),
  ]);

  const proofPoints = [
    {
      title: "Attendance",
      value: attendanceSessions,
      unit: "recorded sessions",
      ready: attendanceSessions > 0,
      icon: CalendarCheck2,
    },
    {
      title: "Homework",
      value: homeworkItems,
      unit: "active assignments",
      ready: homeworkItems > 0,
      icon: BookOpenCheck,
    },
    {
      title: "Examinations",
      value: examinations,
      unit: "configured exams",
      ready: examinations > 0,
      icon: GraduationCap,
    },
    {
      title: "Fee coverage",
      value: feeAssignments,
      unit: "student assignments",
      ready: feeAssignments > 0,
      icon: IndianRupee,
    },
    {
      title: "Collections",
      value: successfulPayments,
      unit: "successful payments",
      ready: successfulPayments > 0,
      icon: CheckCircle2,
    },
    {
      title: "Communication",
      value: announcements,
      unit: "school notices",
      ready: announcements > 0,
      icon: Megaphone,
    },
  ] as const;

  return (
    <main className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.13),transparent_34%),linear-gradient(to_bottom,#f8fafc,#ffffff)] text-slate-950">
      <div className="mx-auto min-h-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/15">
              <MonitorPlay className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
                  SchoolDB presentation
                </p>
                <Badge variant="success">Privacy-safe</Badge>
                <Badge variant="outline">Read only</Badge>
              </div>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                {membership.school.name}
              </h1>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${schoolSlug}/dashboard`}>
              <ArrowLeft className="size-4" /> Exit presentation
            </Link>
          </Button>
        </header>

        <section className="mt-6 overflow-hidden rounded-[32px] bg-slate-950 px-6 py-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="grid items-center gap-9 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <div className="flex items-center gap-2 text-teal-300">
                <Sparkles className="size-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  One secure school workspace
                </span>
              </div>
              <h2 className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                Everyday school operations, connected from admission to family self-service.
              </h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                This view uses live aggregate counts only. Student identities, contact details,
                receipts, messages and individual records stay hidden throughout the presentation.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-7 text-teal-300" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active academic year
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {academicYear?.name || "Not configured"}
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <SafetyLine text="No personal names or phone numbers" />
                <SafetyLine text="No payments, messages or exports" />
                <SafetyLine text="No record creation or editing" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UsersRound} label="Active students" value={activeStudents} />
          <MetricCard icon={School} label="Teachers" value={activeTeachers} />
          <MetricCard icon={GraduationCap} label="Classes" value={activeClasses} />
          <MetricCard icon={BookOpenCheck} label="Sections" value={activeSections} />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
                Operational proof
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Live coverage, without exposing individual records
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Counts are scoped to {academicYear?.name || "the current workspace"}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proofPoints.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border border-slate-200/80 bg-white/90 shadow-sm">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          {item.title}
                        </p>
                        <p className="mt-2 text-3xl font-black tracking-tight">{item.value}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.unit}</p>
                      </div>
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <Badge className="mt-5" variant={item.ready ? "success" : "warning"}>
                      {item.ready ? "Live data available" : "Ready to configure"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
            Platform story
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Show the connected workflow—not a list of menus
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilityCopy.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border border-slate-200/80 bg-white/90 shadow-sm">
                  <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <Card className="border-0 bg-teal-700 text-white shadow-xl shadow-teal-950/15">
            <CardHeader>
              <LockKeyhole className="mb-3 size-8 text-teal-200" />
              <CardTitle className="text-xl text-white">Designed for a safe school visit</CardTitle>
              <CardDescription className="text-teal-50/80">
                Keep this full-screen view open during external demonstrations. Exit only after the meeting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-teal-50/90">
              <SafetyLine text="Aggregate operational evidence" />
              <SafetyLine text="No personally identifiable information" />
              <SafetyLine text="No live external side effects" />
            </CardContent>
          </Card>
          <Card className="border border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Suggested conversation</CardTitle>
              <CardDescription>
                A concise flow for a 15–20 minute decision-maker demonstration.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DemoStep number="01" title="Ask priorities" text="Identify the three workflows costing the school the most time." />
              <DemoStep number="02" title="Show connected data" text="Use the aggregate proof above to establish real operational coverage." />
              <DemoStep number="03" title="Explain one journey" text="Connect admission, attendance, learning, fees and family access." />
              <DemoStep number="04" title="Agree the next step" text="Close on a pilot scope, data template, quotation and target date." />
            </CardContent>
          </Card>
        </section>

        <footer className="py-8 text-center text-xs font-semibold text-slate-500">
          Presentation Mode · live aggregate data · identities protected
        </footer>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <Card className="border border-slate-200/80 bg-white/90 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function SafetyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <CheckCircle2 className="size-4 shrink-0 text-teal-300" />
      <span>{text}</span>
    </div>
  );
}

function DemoStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-xl bg-slate-950 text-[10px] font-black text-white">
          {number}
        </span>
        <p className="font-bold">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
