"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Loader2,
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

function ReportTable({ section, index }: { section: ReportSection; index: number }) {
  return (
    <article className="student-report-section overflow-hidden rounded-2xl border bg-card shadow-sm print:rounded-none print:shadow-none">
      <div className="student-report-section-heading border-b bg-muted/30 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="student-report-section-kicker text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Section {String(index + 1).padStart(2, "0")}</p><h3 className="mt-1 text-base font-bold text-foreground">{section.title}</h3></div>
          <span className="text-xs font-medium text-muted-foreground">
            {section.rows.length} record{section.rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {section.rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left text-xs print:min-w-0 print:table-fixed print:text-[8px]">
            <thead className="student-report-table-head bg-indigo-600 text-white">
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

function PremiumExportPanel({
  studentId,
  pdfReady,
  status,
}: {
  studentId: string;
  pdfReady: boolean;
  status?: string | null;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm print:hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold">Export complete student record</h2>
          <p className="mt-1 text-sm text-muted-foreground">All profile sections are included in both formats.</p>
          {status ? <p className="mt-2 flex items-center gap-2 text-xs text-amber-700"><Loader2 className="size-3.5 animate-spin" />{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><a href={`/api/v1/students/${studentId}/comprehensive-report?format=xlsx`}><FileSpreadsheet className="size-4" />Download Excel</a></Button>
          <Button type="button" variant="outline" disabled={!pdfReady} onClick={() => window.print()}>{pdfReady ? <FileText className="size-4" /> : <Loader2 className="size-4 animate-spin" />}Save as PDF</Button>
        </div>
      </div>
    </section>
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

  if (loading) return <PremiumExportPanel studentId={studentId} pdfReady={false} status="Preparing the PDF report…" />;
  if (error || !report) return <PremiumExportPanel studentId={studentId} pdfReady={false} status={error || "PDF report is unavailable."} />;

  return (
    <>
      <PremiumExportPanel studentId={studentId} pdfReady />
      <section className="student-overall-report-print hidden space-y-5 print:block print:space-y-4">
      <div className="student-report-cover">
        <div className="student-report-cover-accent" />
        <header className="student-report-cover-header">
          <div className="student-report-brand-row">
            <div className="student-report-brand-mark">SDB</div>
            <div><p className="student-report-school-name">{report.schoolName}</p><p className="student-report-document-type">Student records portfolio</p></div>
            <span className="student-report-confidential">Confidential</span>
          </div>
          <div className="student-report-title-block">
            <p>Complete student report</p>
            <h2>{report.studentName}</h2>
            <div className="student-report-meta"><span>Admission No. <strong>{report.admissionNo}</strong></span><span>Prepared <strong>{new Date(report.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></span></div>
          </div>
        </header>

      <div className="student-report-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
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
      <div className="student-report-cover-note"><span>Complete profile</span><span>9 structured sections</span><span>Securely generated by SchoolDB</span></div>
      </div>

      <div className="space-y-5 print:space-y-4">
        {report.sections.map((section, index) => (
          <ReportTable key={section.key} section={section} index={index} />
        ))}
      </div>
      <footer className="student-report-footer"><span>{report.schoolName}</span><span>{report.studentName} · {report.admissionNo}</span><span>Generated by SchoolDB</span></footer>
      </section>
    </>
  );
}
