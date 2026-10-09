"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  CreditCard,
  Download,
  GraduationCap,
  Loader2,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReportValue = string | number | boolean | null;
type ReportSection = {
  key: string;
  title: string;
  columns: string[];
  rows: Array<Record<string, ReportValue>>;
};
type ComprehensiveReport = {
  schoolName: string;
  studentName: string;
  admissionNo: string;
  generatedAt: string;
  sections: ReportSection[];
};

function metric(section: ReportSection | undefined, name: string) {
  return section?.rows.find((row) => row.Metric === name)?.Value ?? null;
}

function displayValue(value: ReportValue) {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardContent className="p-5">
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="size-5" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ReportTable({ section }: { section: ReportSection }) {
  return (
    <article className="student-report-section overflow-hidden rounded-2xl border bg-card shadow-sm print:rounded-none print:shadow-none">
      <div className="border-b bg-muted/30 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-foreground">
            {section.title}
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {section.rows.length} record{section.rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {section.rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left text-xs print:min-w-0 print:table-fixed print:text-[8px]">
            <thead className="bg-indigo-600 text-white print:bg-slate-200 print:text-slate-900">
              <tr>
                {section.columns.map((column) => (
                  <th
                    key={column}
                    className="border-r border-white/20 px-3 py-2.5 font-semibold last:border-r-0 print:border-slate-300 print:px-1.5 print:py-1.5"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {section.rows.map((row, rowIndex) => (
                <tr
                  key={`${section.key}-${rowIndex}`}
                  className="even:bg-muted/20"
                >
                  {section.columns.map((column) => (
                    <td
                      key={column}
                      className="max-w-72 whitespace-pre-wrap break-words border-r px-3 py-2.5 align-top last:border-r-0 print:px-1.5 print:py-1"
                    >
                      {displayValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No {section.title.toLowerCase()} records are available.
        </p>
      )}
    </article>
  );
}

export function StudentOverallReport({ studentId }: { studentId: string }) {
  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/v1/students/${studentId}/comprehensive-report`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok || !result.success)
          throw new Error(
            result.message || "Could not load the complete report.",
          );
        setReport(result.data);
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the complete report.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const summary = useMemo(() => {
    const overview = report?.sections.find(
      (section) => section.key === "overview",
    );
    return {
      enrollment: displayValue(metric(overview, "Current enrollment")),
      attendance: displayValue(metric(overview, "Attendance")),
      attendanceRecords: displayValue(metric(overview, "Attendance records")),
      payable: displayValue(metric(overview, "Fees payable")),
      paid: displayValue(metric(overview, "Fees paid")),
      outstanding: displayValue(metric(overview, "Fees outstanding")),
      performance: displayValue(metric(overview, "Academic performance")),
    };
  }, [report]);

  if (loading)
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Preparing the complete report…
      </div>
    );
  if (error || !report)
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        {error || "Complete report unavailable."}
      </div>
    );

  return (
    <section className="student-overall-report-print space-y-5 print:space-y-4">
      <header className="flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/60 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between print:rounded-none print:border-slate-300 print:bg-white print:p-3 print:shadow-none">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Complete student report
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {report.studentName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.schoolName} · Admission {report.admissionNo} · Generated{" "}
            {new Date(report.generatedAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild type="button" className="gap-2">
            <a
              href={`/api/v1/students/${studentId}/comprehensive-report?format=xlsx`}
            >
              <Download className="size-4" /> Download Excel
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
        <MetricCard
          icon={GraduationCap}
          label="Enrollment"
          value={summary.enrollment}
          detail="Current class, section and academic year"
          tone="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          icon={CalendarCheck}
          label="Attendance"
          value={summary.attendance}
          detail={`${summary.attendanceRecords} attendance records`}
          tone="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          icon={CreditCard}
          label="Fee outstanding"
          value={`₹${summary.outstanding}`}
          detail={`₹${summary.paid} paid of ₹${summary.payable}`}
          tone="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={Award}
          label="Performance"
          value={summary.performance}
          detail="Across all recorded examination marks"
          tone="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="space-y-5 print:space-y-4">
        {report.sections.map((section) => (
          <ReportTable key={section.key} section={section} />
        ))}
      </div>
    </section>
  );
}
