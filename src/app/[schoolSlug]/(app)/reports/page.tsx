import {
  AlertTriangle,
  BookOpenCheck,
  BusFront,
  CalendarCheck2,
  IndianRupee,
  LibraryBig,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportsFilters } from "@/features/reports/ReportsFilters";
import { getSchoolReport } from "@/features/reports/report.service";
import { requireRole } from "@/lib/auth";

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    from?: string;
    to?: string;
  }>;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function ReportsPage({ params, searchParams }: Props) {
  const [{ schoolSlug }, filters] = await Promise.all([params, searchParams]);
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const report = await getSchoolReport(membership.schoolId, filters);

  if (!report) {
    return (
      <PageContainer>
        <PageHeader
          title="Reports & Analytics"
          description="Create an academic year to start building school reports."
        />
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <CalendarCheck2 className="size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">
              No academic year available
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add and activate an academic year, then return to this reporting
              center.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const hasCustomAttendanceRange = Boolean(filters.from || filters.to);
  const attendanceTrendStart = new Date(`${report.scope.to}T00:00:00`);
  attendanceTrendStart.setDate(attendanceTrendStart.getDate() - 29);
  const attendanceTrendStartKey = [
    attendanceTrendStart.getFullYear(),
    String(attendanceTrendStart.getMonth() + 1).padStart(2, "0"),
    String(attendanceTrendStart.getDate()).padStart(2, "0"),
  ].join("-");

  const attendanceTrend = hasCustomAttendanceRange
    ? report.attendance.daily
    : report.attendance.daily.filter(
        (day) => day.date >= attendanceTrendStartKey,
      );

  const attendanceTrendAbsences = attendanceTrend.reduce(
    (sum, day) => sum + day.absent,
    0,
  );
  const attendanceTrendAverage = attendanceTrend.length
    ? Math.round(attendanceTrendAbsences / attendanceTrend.length)
    : 0;
  const attendanceTrendHighest = Math.max(
    0,
    ...attendanceTrend.map((day) => day.absent),
  );

  return (
    <PageContainer>
      <div className="print:hidden">
        <PageHeader
          title="Reports & Analytics"
          description="One filtered view of student strength, attendance, finance, academics and school operations."
        />
      </div>

      <header className="mb-6 hidden border-b pb-4 print:block">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">
          SchoolDB · Official school report
        </p>
        <h1 className="mt-2 text-2xl font-black">{membership.school.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {report.scope.academicYearName} · {report.scope.className} ·{" "}
          {report.scope.sectionName} · {shortDate(report.scope.from)} to{" "}
          {shortDate(report.scope.to)}
        </p>
      </header>

      <ReportsFilters
        key={`${report.scope.academicYearId}:${report.scope.classId}:${report.scope.sectionId}:${report.scope.from}:${report.scope.to}`}
        schoolSlug={schoolSlug}
        initial={{
          academicYearId: report.scope.academicYearId,
          classId: report.scope.classId,
          sectionId: report.scope.sectionId,
          from: report.scope.from,
          to: report.scope.to,
        }}
      />

      <section className="relative mt-6 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] print:bg-white print:shadow-none sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">
              Reporting scope
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
              {report.scope.className}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {report.scope.sectionName} · {report.scope.academicYearName} ·{" "}
              {shortDate(report.scope.from)} – {shortDate(report.scope.to)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroMetric
              label="Students"
              value={report.students.total.toLocaleString("en-IN")}
            />
            <HeroMetric
              label="Attendance"
              value={`${report.attendance.percentage}%`}
            />
            <HeroMetric
              label="Collected"
              value={currency(report.fees.collected)}
            />
            <HeroMetric
              label="Exam average"
              value={`${report.academics.averagePercentage}%`}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label="Student strength"
          value={report.students.total.toLocaleString("en-IN")}
          detail={`${report.students.classes.length} class${report.students.classes.length === 1 ? "" : "es"} in scope`}
          tone="indigo"
        />
        <MetricCard
          icon={CalendarCheck2}
          label="Attendance"
          value={`${report.attendance.percentage}%`}
          detail={`${report.attendance.sessions} sessions · ${report.attendance.total.toLocaleString("en-IN")} records`}
          tone="emerald"
        />
        <MetricCard
          icon={IndianRupee}
          label="Fees collected"
          value={currency(report.fees.collected)}
          detail={`${report.fees.payments} successful payment${report.fees.payments === 1 ? "" : "s"}`}
          tone="blue"
        />
        <MetricCard
          icon={WalletCards}
          label="Outstanding fees"
          value={currency(report.fees.outstanding)}
          detail={`${report.fees.installments} assigned installments`}
          tone={report.fees.outstanding > 0 ? "amber" : "emerald"}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ReportCard
          accent
          title="Absentees trend"
          description={
            hasCustomAttendanceRange
              ? "Daily absent student count for the selected period"
              : "Daily absent student count for the last 30 days"
          }
          badge={`${attendanceTrendAbsences.toLocaleString("en-IN")} absences`}
        >
          <AbsenteesChart data={attendanceTrend} />
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniMetric
              label="Latest"
              value={attendanceTrend.at(-1)?.absent ?? 0}
              className="text-rose-700"
            />
            <MiniMetric
              label="Daily average"
              value={attendanceTrendAverage}
            />
            <MiniMetric
              label="Highest"
              value={attendanceTrendHighest}
              className="text-amber-700"
            />
          </div>
        </ReportCard>

        <ReportCard
          title="Student distribution"
          description="Current enrollment strength by class"
          badge={`${report.students.total} students`}
        >
          <BarList
            rows={report.students.classes.map((item) => ({
              label: item.name,
              value: item.count,
            }))}
            empty="No enrolled students in this scope."
          />
          {report.students.gender.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
              {report.students.gender.map((item) => (
                <Badge key={item.label} variant="outline">
                  {item.label
                    .toLowerCase()
                    .replace(/^./, (letter) => letter.toUpperCase())}
                  : {item.count}
                </Badge>
              ))}
            </div>
          )}
        </ReportCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportCard
          title="Academic performance"
          description="Exam performance within the selected dates"
          badge={`${report.academics.marks} marks`}
        >
          <div className="mb-5 grid grid-cols-3 gap-3">
            <MiniMetric
              label="Average"
              value={`${report.academics.averagePercentage}%`}
            />
            <MiniMetric
              label="Pass rate"
              value={`${report.academics.passPercentage}%`}
            />
            <MiniMetric label="Homework" value={report.academics.homework} />
          </div>
          <BarList
            rows={report.academics.subjects.map((item) => ({
              label: item.name,
              value: item.averagePercentage,
              suffix: "%",
            }))}
            maximum={100}
            empty="No exam marks recorded for this period."
          />
        </ReportCard>

        <ReportCard
          title="Fee position"
          description="Assigned ledger compared with successful payments"
          badge={`${report.fees.payments} payments`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyBlock label="Total payable" value={report.fees.payable} />
            <MoneyBlock label="Total paid" value={report.fees.paid} />
            <MoneyBlock label="Concessions" value={report.fees.concession} />
            <MoneyBlock
              label="Outstanding"
              value={report.fees.outstanding}
              alert={report.fees.outstanding > 0}
            />
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
              style={{
                width: `${Math.min(100, report.fees.payable > 0 ? (report.fees.paid / report.fees.payable) * 100 : 0)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-muted-foreground">
            {report.fees.payable > 0
              ? ((report.fees.paid / report.fees.payable) * 100).toFixed(1)
              : "0.0"}
            % collected against assigned fees
          </p>
        </ReportCard>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <OperationCard
          icon={BookOpenCheck}
          label="Homework published"
          value={report.academics.homework}
          detail="Within the selected period"
        />
        <OperationCard
          icon={LibraryBig}
          label="Overdue library loans"
          value={report.operations.overdueLoans}
          detail={
            report.operations.overdueLoans
              ? "Requires follow-up"
              : "No overdue loans"
          }
          alert={report.operations.overdueLoans > 0}
        />
        <OperationCard
          icon={BusFront}
          label="Transport assignments"
          value={report.operations.transportAssignments}
          detail="Active students in scope"
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)] print:break-before-page print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/50 to-amber-50/30 px-5 py-4">
          <div>
            <h2 className="font-bold">Low attendance attention list</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Students below 75% during the selected reporting period.
            </p>
          </div>
          <Badge variant={report.attendance.low.length ? "warning" : "success"}>
            {report.attendance.low.length} students
          </Badge>
        </div>
        {report.attendance.low.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Admission no.</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Present</th>
                  <th className="px-5 py-3 text-right">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.attendance.low.map((student) => (
                  <tr key={student.studentId} className="transition-colors hover:bg-indigo-50/25">
                    <td className="px-5 py-4 font-semibold">
                      {student.fullName}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {student.admissionNo}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {student.className} - {student.sectionName}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {student.present} / {student.total}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Badge variant="warning">{student.percentage}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center text-center">
            <TrendingUp className="size-8 text-emerald-600" />
            <p className="mt-3 font-bold">No low-attendance students</p>
            <p className="mt-1 text-sm text-muted-foreground">
              There is nothing requiring attention in this scope.
            </p>
          </div>
        )}
      </section>

      <footer className="mt-8 hidden border-t pt-3 text-xs text-muted-foreground print:flex print:justify-between">
        <span>Generated from SchoolDB Reports & Analytics</span>
        <span>{membership.school.name}</span>
      </footer>
    </PageContainer>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-28 rounded-2xl border border-indigo-100/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

const tones = {
  indigo: "bg-indigo-50 text-indigo-700",
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
  detail: string;
  tone: keyof typeof tones;
}) {
  return (
    <div className="group relative min-h-[124px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-5 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)] transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-[0_16px_34px_rgba(79,70,229,0.07)] print:shadow-none">
      <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-indigo-100/25 blur-2xl transition-transform duration-500 group-hover:scale-125" />

      <div className="relative flex h-full items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">
            {value}
          </p>
          <p className="mt-1.5 truncate text-xs text-slate-500">{detail}</p>
        </div>

        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5 ${tones[tone]}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  badge,
  children,
  accent = false,
}: {
  title: string;
  description: string;
  badge: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden rounded-3xl border p-5 shadow-[0_12px_35px_rgba(15,23,42,0.045)] print:break-inside-avoid print:shadow-none ${accent ? "border-rose-100 bg-gradient-to-br from-white via-white to-rose-50/35" : "border-slate-200/80 bg-white"}`}>
      {accent && (
        <>
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-rose-200/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-52 rounded-full bg-orange-100/25 blur-3xl" />
        </>
      )}
      <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-[-0.015em] text-slate-950">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.025)] backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-lg font-black ${className}`}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
    </div>
  );
}

function MoneyBlock({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${alert ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50" : "border-slate-200/70 bg-slate-50/45"}`}
    >
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-2 text-xl font-black ${alert ? "text-amber-800" : ""}`}>
        {currency(value)}
      </p>
    </div>
  );
}

function OperationCard({
  icon: Icon,
  label,
  value,
  detail,
  alert = false,
}: {
  icon: typeof LibraryBig;
  label: string;
  value: number;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-4 rounded-3xl border bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(79,70,229,0.07)] print:shadow-none ${alert ? "border-amber-200" : "border-slate-200/70 hover:border-indigo-100"}`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${alert ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}
      >
        {alert ? (
          <AlertTriangle className="size-5" />
        ) : (
          <Icon className="size-5" />
        )}
      </div>
      <div>
        <p className="text-2xl font-black">{value.toLocaleString("en-IN")}</p>
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function BarList({
  rows,
  maximum,
  empty,
}: {
  rows: Array<{ label: string; value: number; suffix?: string }>;
  maximum?: number;
  empty: string;
}) {
  if (!rows.length)
    return (
      <div className="flex min-h-44 items-center justify-center rounded-xl bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  const max = maximum ?? Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.slice(0, 10).map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-xs">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="font-bold text-muted-foreground">
              {row.value.toLocaleString("en-IN")}
              {row.suffix}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-400"
              style={{
                width: `${Math.max(2, Math.min(100, (row.value / max) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AbsenteesChart({
  data,
}: {
  data: Array<{ date: string; absent: number }>;
}) {
  if (!data.length)
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
        No attendance records for this period.
      </div>
    );

  const width = 800;
  const height = 245;
  const paddingX = 28;
  const paddingTop = 18;
  const paddingBottom = 24;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingTop - paddingBottom;
  const highest = Math.max(1, ...data.map((item) => item.absent));
  const axisMax = Math.max(4, Math.ceil(highest / 4) * 4);
  const ticks = [0, axisMax / 4, axisMax / 2, (axisMax * 3) / 4, axisMax];

  const coordinates = data.map((item, index) => {
    const x =
      paddingX +
      (data.length === 1
        ? usableWidth / 2
        : (index / (data.length - 1)) * usableWidth);
    const y =
      paddingTop +
      usableHeight -
      (item.absent / axisMax) * usableHeight;

    return { ...item, x, y };
  });

  const points = coordinates.map((item) => `${item.x},${item.y}`).join(" ");
  const area = `${paddingX},${height - paddingBottom} ${points} ${width - paddingX},${height - paddingBottom}`;

  return (
    <div>
      <svg
        role="img"
        aria-label="Daily absentee count trend"
        viewBox={`0 0 ${width} ${height}`}
        className="h-60 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="absenteesArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="absenteesLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y =
            paddingTop +
            usableHeight -
            (tick / axisMax) * usableHeight;

          return (
            <g key={tick}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
              />
              <text
                x={paddingX}
                y={y - 5}
                fontSize="10"
                fill="currentColor"
                opacity="0.45"
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        <polygon points={area} fill="url(#absenteesArea)" />
        <polyline
          points={points}
          fill="none"
          stroke="url(#absenteesLine)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coordinates.map((item) => (
          <g key={item.date}>
            <circle
              cx={item.x}
              cy={item.y}
              r="5"
              fill="white"
              stroke="#e11d48"
              strokeWidth="3"
            >
              <title>{`${shortDate(item.date)}: ${item.absent} absent`}</title>
            </circle>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted-foreground">
        <span>{shortDate(data[0].date)}</span>
        <span>{shortDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}
