import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  IndianRupee,
  Users,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here’s a clear view of how your school is doing today."
      />

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
        <Card className="border-border/80 bg-card/90 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                Attendance overview
              </p>
              <CardTitle className="mt-1.5 text-lg">
                This week’s attendance
              </CardTitle>
            </div>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
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
                  <div className="flex h-32 w-full items-end rounded-t-lg bg-muted/70 px-1">
                    <div
                      className="w-full rounded-md bg-primary transition-all"
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
        <Card className="border-border/80 bg-card/90 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
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
              <div key={title} className="flex items-start gap-3">
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
