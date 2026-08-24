import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  IndianRupee,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const attendanceData = [
  { day: "Mon", value: 78 },
  { day: "Tue", value: 92 },
  { day: "Wed", value: 86 },
  { day: "Thu", value: 96 },
  { day: "Fri", value: 89 },
  { day: "Sat", value: 20 },
  { day: "Sun", value: 10 },
];

const priorities = [
  {
    title: "Morning attendance",
    description: "All sections are reporting",
    status: "Completed",
    type: "completed",
  },
  {
    title: "Fee follow-up",
    description: "18 reminders scheduled",
    status: "In progress",
    type: "progress",
  },
  {
    title: "New admissions",
    description: "6 applications to review",
    status: "Action needed",
    type: "action",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Dashboard"
        description="Here’s a clear view of how your school is doing today."
      />

      {/* Premium Executive Hero */}
      <section className="premium-hero px-6 py-7 text-white md:px-10 md:py-10">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-teal-200 uppercase backdrop-blur-md">
              <Sparkles className="size-3" />
              Academic Year 2025–26
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-[-0.04em] text-white md:text-5xl md:leading-[1.08]">
              Your school is moving
              <br className="hidden md:block" />{" "}
              <span className="bg-gradient-to-r from-teal-200 via-cyan-200 to-blue-200 bg-clip-text text-transparent">
                in the right direction.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 md:text-base">
              Attendance remains strong this week, while fee collection is
              performing ahead of the current monthly target.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex size-9 items-center justify-center rounded-xl border border-teal-300/10 bg-teal-400/10">
                  <CalendarCheck className="size-4 text-teal-300" />
                  <span className="absolute size-2 animate-pulse rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.8)]" />
                </div>

                <div>
                  <p className="text-lg font-bold leading-none text-white">
                    96.2%
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-white/45">
                    Average attendance
                  </p>
                </div>
              </div>

              <div className="hidden h-9 w-px bg-white/10 sm:block" />

              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl border border-blue-300/10 bg-blue-400/10">
                  <GraduationCap className="size-4 text-blue-200" />
                </div>

                <div>
                  <p className="text-lg font-bold leading-none text-white">
                    2,450
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-white/45">
                    Active students
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Growth metric */}
          <div className="group flex min-w-[220px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.1]">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-teal-300/15 bg-gradient-to-br from-teal-300/20 to-cyan-400/5">
              <TrendingUp className="size-5 text-teal-200 transition-transform duration-300 group-hover:scale-110" />
            </div>

            <div>
              <p className="text-2xl font-bold tracking-tight text-white">
                +12.4%
              </p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-white/45 uppercase">
                Monthly Growth
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value="2,450"
          icon={GraduationCap}
          description="Active students"
          trend={{ value: "+15 this month", positive: true }}
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Teachers"
          value="120"
          icon={Users}
          description="Teaching staff"
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Attendance"
          value="96%"
          icon={CalendarCheck}
          description="Average this week"
          trend={{ value: "+2.1% vs last week", positive: true }}
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />

        <StatCard
          title="Fee Collection"
          value="₹1.28L"
          icon={IndianRupee}
          description="This academic month"
          trend={{ value: "12.4% above target", positive: true }}
          className="premium-card rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        />
      </section>

      {/* Dashboard content */}
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        {/* Attendance chart */}
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                Attendance Overview
              </p>

              <CardTitle className="mt-1.5 text-xl font-bold tracking-tight">
                This week&apos;s attendance
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Daily attendance performance across the school.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-primary/10 bg-primary/8 px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <TrendingUp className="size-3.5" />
                96.2% Avg
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex h-64 items-end justify-between gap-2 sm:gap-3 md:gap-5">
              {attendanceData.map(({ day, value }) => (
                <div
                  key={day}
                  className="group flex h-full flex-1 flex-col justify-end gap-3"
                >
                  <div className="relative flex h-52 items-end rounded-xl bg-muted/45 p-1 ring-1 ring-border/40">
                    <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1 text-[10px] font-bold text-background opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
                      {value}%
                    </div>

                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-primary via-primary to-teal-400 transition-all duration-500 ease-out group-hover:brightness-110"
                      style={{ height: `${value}%` }}
                    />
                  </div>

                  <span className="text-center text-[11px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priorities */}
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="flex flex-row items-start justify-between border-b border-border/60 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                Today at a glance
              </p>

              <CardTitle className="mt-1.5 text-xl font-bold tracking-tight">
                Daily Priorities
              </CardTitle>
            </div>

            <button
              type="button"
              aria-label="More priority options"
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </CardHeader>

          <CardContent className="space-y-2 p-4">
            {priorities.map((priority) => {
              const isCompleted = priority.type === "completed";
              const isProgress = priority.type === "progress";

              return (
                <button
                  key={priority.title}
                  type="button"
                  className="group flex w-full items-start gap-3.5 rounded-2xl border border-transparent p-3.5 text-left transition-all duration-200 hover:border-border/70 hover:bg-background/70 hover:shadow-sm"
                >
                  <div
                    className={[
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                      isCompleted && "bg-emerald-500/10 text-emerald-600",
                      isProgress && "bg-blue-500/10 text-blue-600",
                      !isCompleted &&
                        !isProgress &&
                        "bg-amber-500/10 text-amber-600",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {priority.type === "action" ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {priority.title}
                      </p>

                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                          isCompleted && "bg-emerald-500/10 text-emerald-700",
                          isProgress && "bg-blue-500/10 text-blue-700",
                          !isCompleted &&
                            !isProgress &&
                            "bg-amber-500/10 text-amber-700",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {priority.status}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                      {priority.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
