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
  MoreHorizontal,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <PageHeader
        title="Dashboard"
        description="Here’s a clear view of how your school is doing today."
      />

      {/* Premium Hero Section */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 text-white shadow-2xl shadow-slate-900/20 md:px-10 md:py-10">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-teal-500/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-blue-500/20 blur-[100px]" />

        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-teal-300 backdrop-blur-md">
              <Sparkles className="size-3" />
              ACADEMIC YEAR 2025–26
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-4xl md:leading-tight">
              Everything is moving in <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-200">
                the right direction.
              </span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
              Attendance is incredibly strong this week, and fee collection has
              already surpassed this month’s primary targets.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                <span>
                  <strong className="text-lg font-bold text-white">
                    96.2%
                  </strong>{" "}
                  attendance
                </span>
              </div>
              <span className="h-5 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                <span>
                  <strong className="text-lg font-bold text-white">
                    2,450
                  </strong>{" "}
                  active students
                </span>
              </div>
            </div>
          </div>

          {/* Glassmorphism Metric Card */}
          <div className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md transition-all hover:bg-white/10">
            <div className="rounded-xl border border-teal-400/20 bg-teal-400/20 p-3 transition-transform group-hover:scale-110">
              <TrendingUp className="size-6 text-teal-300" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-white">
                +12.4%
              </p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Monthly Growth
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={2450}
          icon={GraduationCap}
          description="Active students"
          trend={{ value: "+15 this month", positive: true }}
          className="transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
        />
        <StatCard
          title="Teachers"
          value={120}
          icon={Users}
          description="Teaching staff"
          className="transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
        />
        <StatCard
          title="Attendance"
          value="96%"
          icon={CalendarCheck}
          className="transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
        />
        <StatCard
          title="Fee collection"
          value="₹1.28L"
          icon={IndianRupee}
          description="This academic month"
          trend={{ value: "12.4% above target", positive: true }}
          className="transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
        />
      </div>

      {/* Main Content Grid */}
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        {/* Chart Card */}
        <Card className="overflow-hidden border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur-xl transition-all hover:shadow-xl">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                Attendance Overview
              </p>
              <CardTitle className="mt-1 text-xl text-slate-800">
                This week’s attendance
              </CardTitle>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-600/10">
              <TrendingUp className="size-3" />
              96.2% Avg
            </span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex h-52 items-end justify-between gap-2 md:gap-4">
              {[78, 92, 86, 96, 89, 20, 10].map((value, index) => (
                <div
                  key={index}
                  className="group flex flex-1 flex-col items-center gap-3"
                >
                  <div className="relative flex h-40 w-full items-end justify-center rounded-xl bg-slate-50 p-1 ring-1 ring-slate-100">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 scale-0 rounded-md bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
                      {value}%
                    </div>
                    {/* Animated Bar */}
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ease-in-out group-hover:bg-teal-500 ${value === 0 ? "bg-transparent" : "bg-slate-200"}`}
                      style={{ height: `${value}%` }}
                    >
                      {/* Gradient overlay for premium feel */}
                      {value > 0 && (
                        <div className="h-full w-full rounded-lg bg-gradient-to-t from-teal-500 to-teal-400 opacity-80" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-slate-800 transition-colors">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priorities Card */}
        <Card className="border-slate-200/60 bg-white/80 shadow-lg shadow-slate-200/40 backdrop-blur-xl transition-all hover:shadow-xl">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                Today at a glance
              </p>
              <CardTitle className="mt-1 text-xl text-slate-800">
                Daily Priorities
              </CardTitle>
            </div>
            <button className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <MoreHorizontal className="size-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {[
              [
                "Morning attendance",
                "All sections are reporting",
                "Completed",
                "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
              ],
              [
                "Fee follow-up",
                "18 reminders scheduled",
                "In progress",
                "bg-blue-50 text-blue-600 ring-blue-500/20",
              ],
              [
                "New admissions",
                "6 applications to review",
                "Action needed",
                "bg-amber-50 text-amber-600 ring-amber-500/20",
              ],
            ].map(([title, text, status, badgeColor], index) => (
              <div
                key={title}
                className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm"
              >
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100 transition-colors group-hover:bg-slate-100">
                  {index === 2 ? (
                    <ArrowUpRight className="size-4 text-slate-600" />
                  ) : (
                    <CheckCircle2
                      className={`size-4 ${index === 0 ? "text-emerald-500" : "text-blue-500"}`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {title}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeColor}`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
