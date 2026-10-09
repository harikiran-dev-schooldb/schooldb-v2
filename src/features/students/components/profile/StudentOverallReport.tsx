"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  Loader2,
  Phone,
  Printer,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OverallReport = {
  student: {
    fullName: string | null;
    admissionNo: string;
    status: string;
  };
  enrollment: {
    className: string;
    sectionName: string;
    academicYear: string;
    rollNo: number | null;
    houseName: string | null;
  } | null;
  parents: Array<{
    name: string;
    phone?: string | null;
    email?: string | null;
    relationship: string;
  }>;
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    percentage: number;
  };
  fees: {
    payable: number;
    paid: number;
    outstanding: number;
    pendingInstallments: number;
  };
  recentResults: Array<{
    id: string;
    exam: string;
    subject: string;
    obtained: number | null;
    maximum: number;
    passMarks: number | null;
    status: string;
  }>;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
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
        <div className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-5" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function StudentOverallReport({ studentId }: { studentId: string }) {
  const [report, setReport] = useState<OverallReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/v1/mobile/admin/students/${studentId}`, { cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load the overall report.");
        setReport(result.data);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load the overall report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [studentId]);

  const resultSummary = useMemo(() => {
    const graded = report?.recentResults.filter((item) => item.obtained !== null && item.maximum > 0) ?? [];
    const obtained = graded.reduce((sum, item) => sum + (item.obtained ?? 0), 0);
    const maximum = graded.reduce((sum, item) => sum + item.maximum, 0);
    return {
      percentage: maximum ? Math.round((obtained / maximum) * 1000) / 10 : null,
      graded: graded.length,
    };
  }, [report]);

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Preparing the overall report…</div>;
  }
  if (error || !report) {
    return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{error || "Overall report unavailable."}</div>;
  }

  return (
    <section className="space-y-5 print:space-y-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/60 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between print:border-slate-300 print:bg-white print:shadow-none">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Student 360° report</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{report.student.fullName || report.student.admissionNo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Admission {report.student.admissionNo}
            {report.enrollment ? ` · ${report.enrollment.className} · Section ${report.enrollment.sectionName} · ${report.enrollment.academicYear}` : " · Not currently enrolled"}
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2 print:hidden" onClick={() => window.print()}>
          <Printer className="size-4" /> Print report
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={GraduationCap} label="Enrollment" value={report.enrollment ? `${report.enrollment.className} ${report.enrollment.sectionName}` : "Not enrolled"} detail={report.enrollment ? `Roll ${report.enrollment.rollNo ?? "—"} · ${report.enrollment.houseName || "No house"}` : "Assign an active enrollment"} tone="bg-indigo-50 text-indigo-600" />
        <MetricCard icon={CalendarCheck} label="Attendance" value={report.attendance.total ? `${report.attendance.percentage}%` : "No records"} detail={`${report.attendance.present} present · ${report.attendance.absent} absent · ${report.attendance.late} late`} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={CreditCard} label="Fee outstanding" value={money(report.fees.outstanding)} detail={`${money(report.fees.paid)} paid of ${money(report.fees.payable)} · ${report.fees.pendingInstallments} pending`} tone="bg-amber-50 text-amber-700" />
        <MetricCard icon={Award} label="Recent performance" value={resultSummary.percentage === null ? "No marks" : `${resultSummary.percentage}%`} detail={`${resultSummary.graded} recently graded subject${resultSummary.graded === 1 ? "" : "s"}`} tone="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base"><Award className="size-5 text-violet-600" />Recent academic results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {report.recentResults.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Exam</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3 text-right">Marks</th><th className="px-5 py-3">Status</th></tr></thead>
                  <tbody className="divide-y">
                    {report.recentResults.map((result) => (
                      <tr key={result.id}>
                        <td className="px-5 py-3 font-medium">{result.exam}</td>
                        <td className="px-5 py-3">{result.subject}</td>
                        <td className="px-5 py-3 text-right font-semibold">{result.obtained ?? "—"} / {result.maximum}</td>
                        <td className="px-5 py-3"><Badge variant={result.status === "FAIL" || result.status === "ABSENT" ? "destructive" : "secondary"}>{result.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="p-6 text-sm text-muted-foreground">No examination marks have been recorded for the current enrollment.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base"><Users className="size-5 text-blue-600" />Family contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {report.parents.length ? report.parents.map((parent, index) => (
              <div key={`${parent.relationship}-${parent.phone || parent.email || index}`} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-semibold">{parent.name}</p><Badge variant="outline">{parent.relationship}</Badge></div>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-3.5" />{parent.phone || parent.email || "No contact provided"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No family contact is linked to this student.</p>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
