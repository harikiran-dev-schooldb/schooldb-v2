import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  IndianRupee,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here’s a clear view of how your school is doing today."
      />

      <section className="premium-hero mb-6 px-6 py-7 text-white md:px-8 md:py-8">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-teal-200">
              <span className="flex size-5 items-center justify-center rounded-full border border-teal-200/20 bg-teal-300/10"><Sparkles className="size-3" /></span>
              ACADEMIC YEAR 2025–26
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-bold tracking-[-0.045em] md:text-[2rem]">Everything is moving in the right direction.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Attendance is strong, and fee collection is ahead of this month’s target.</p>
            <div className="mt-6 flex flex-wrap gap-5 text-xs text-slate-300">
              <span><strong className="mr-1 text-base font-bold text-white">96.2%</strong> attendance rate</span>
              <span className="h-5 w-px bg-white/15" />
              <span><strong className="mr-1 text-base font-bold text-white">2,450</strong> active students</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.09] px-4 py-3.5 shadow-lg shadow-black/10 backdrop-blur-sm">
            <div className="rounded-xl border border-teal-200/10 bg-teal-300/15 p-2.5"><TrendingUp className="size-5 text-teal-200" /></div>
            <div><p className="text-xl font-bold tracking-[-0.04em]">+12.4%</p><p className="mt-0.5 text-xs text-slate-300">monthly growth</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={2450}
          icon={GraduationCap}
          description="Active students"
          trend={{
            value: "+15 this month",
            positive: true,
          }}
        />

        <StatCard
          title="Teachers"
          value={120}
          icon={Users}
          description="Teaching staff"
        />

        <StatCard title="Attendance" value="96%" icon={CalendarCheck} />

        <StatCard
          title="Fee collection"
          value="₹1.28L"
          icon={IndianRupee}
          description="This academic month"
          trend={{ value: "12.4% above target", positive: true }}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="premium-card">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                Attendance overview
              </p>
              <CardTitle className="mt-1.5 text-lg">
                This week’s attendance
              </CardTitle>
            </div>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/10">
              96.2%
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end justify-between gap-3 pt-4">
              {[78, 92, 86, 96, 89, 0, 0].map((value, index) => (
                <div
                  key={index}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                    <div className="flex h-32 w-full items-end rounded-t-xl bg-slate-100/80 px-1">
                      <div
                      className="w-full rounded-lg bg-gradient-to-t from-primary to-primary/70 transition-all"
                      style={{ height: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardHeader>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
              Today at a glance
            </p>
            <CardTitle className="mt-1.5 text-lg">Daily priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Morning attendance", "All sections are reporting", "Completed"],
              ["Fee follow-up", "18 reminders scheduled", "In progress"],
              ["New admissions", "6 applications to review", "Action needed"],
            ].map(([title, text, status], index) => (
              <div key={title} className="flex items-start gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-border/70 hover:bg-white/70">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                  {index === 2 ? (
                    <ArrowUpRight className="size-3.5 text-primary" />
                  ) : (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{title}</p>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
