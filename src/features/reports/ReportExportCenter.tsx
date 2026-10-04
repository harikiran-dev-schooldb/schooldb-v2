"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, GraduationCap, IndianRupee, School, UsersRound } from "lucide-react";

import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportExportButton } from "@/features/reports/ReportExportButton";

type Props = {
  schoolSlug: string;
  filters: {
    academicYearId: string;
    classId: string;
    sectionId: string;
    from: string;
    to: string;
  };
  exams: Array<{ id: string; name: string }>;
};

type StudentFeeOption = {
  id: string;
  feePlan?: { name?: string };
};

function ExportLink({ href, label, disabled = false }: { href: string; label: string; disabled?: boolean }) {
  return (
    <Button asChild={!disabled} variant="outline" className="h-auto min-h-11 w-full justify-between whitespace-normal py-2 text-left" disabled={disabled}>
      {disabled ? (
        <span>{label}<Download className="size-4 shrink-0" /></span>
      ) : (
        <a href={href}>{label}<Download className="size-4 shrink-0" /></a>
      )}
    </Button>
  );
}

function ExportGroup({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: typeof UsersRound;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-slate-200/80 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-indigo-600" />{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  );
}

export function ReportExportCenter({ schoolSlug, filters, exams }: Props) {
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [studentFees, setStudentFees] = useState<StudentFeeOption[]>([]);
  const [studentFeeId, setStudentFeeId] = useState("");

  useEffect(() => {
    if (!studentId) return;
    const controller = new AbortController();
    void fetch(`/api/v1/student-fees?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((result: { success?: boolean; data?: StudentFeeOption[] }) => {
        const rows = result.success && Array.isArray(result.data) ? result.data : [];
        setStudentFees(rows);
        setStudentFeeId(rows[0]?.id ?? "");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStudentFees([]);
          setStudentFeeId("");
        }
      });
    return () => controller.abort();
  }, [studentId]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.academicYearId) params.set("academicYearId", filters.academicYearId);
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.sectionId) params.set("sectionId", filters.sectionId);
    if (filters.from) params.set("fromDate", filters.from);
    if (filters.to) params.set("toDate", filters.to);
    return params;
  }, [filters]);

  const reportUrl = (path: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams(query);
    Object.entries(extra ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/api/v1/reports/${schoolSlug}/${path}${params.size ? `?${params.toString()}` : ""}`;
  };
  const attendanceReady = Boolean(filters.academicYearId && filters.classId && filters.sectionId);
  const examReady = Boolean(examId && filters.classId);
  const now = new Date();

  return (
    <section className="mt-6 print:hidden">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Centralized downloads</p>
        <h2 className="mt-1 text-xl font-black tracking-tight">Report export center</h2>
        <p className="mt-1 text-sm text-muted-foreground">All downloads use the reporting scope selected above. Only super administrators, principals, and school administrators can access these exports.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExportGroup title="People & academics" icon={GraduationCap}>
          {filters.academicYearId ? (
            <ReportExportButton
              query={query.toString()}
              label="School summary CSV"
              className="h-auto min-h-11 w-full justify-between whitespace-normal py-2 text-left"
            />
          ) : (
            <ExportLink href="#" label="School summary CSV" disabled />
          )}
          <ExportLink href={reportUrl("students")} label="Student master report" />
          <ExportLink href={reportUrl("teachers")} label="Teacher master report" />
          <ExportLink href={reportUrl("attendance/class")} label="Class attendance report" disabled={!attendanceReady} />
          <div className="pt-1">
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent>{exams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ExportLink href={examId ? reportUrl(`exams/${examId}/results`) : "#"} label="Exam results report" disabled={!examReady} />
          {!filters.classId ? <p className="text-xs text-muted-foreground">Select a class above to export exam results.</p> : null}
        </ExportGroup>

        <ExportGroup title="Fees & finance" icon={IndianRupee}>
          <ExportLink href={reportUrl("fees/term-summary")} label="Fee term summary" />
          <ExportLink href={reportUrl("fees/collection-summary")} label="Fee collection summary" />
          <ExportLink href={reportUrl("fees/outstanding")} label="Outstanding fees" />
          <ExportLink href={reportUrl("fees/payments")} label="Payment history" />
          <ExportLink href={reportUrl("expenses")} label="Expense report" />
          <ExportLink href={`/api/v1/operations?kind=payroll-report&year=${now.getFullYear()}&month=${now.getMonth() + 1}`} label="Current-month payroll CSV" />
        </ExportGroup>

        <ExportGroup title="Registers & operations" icon={School}>
          <ExportLink href={reportUrl("leave-permissions", { from: filters.from, to: filters.to })} label="Leave and permissions" />
          <ExportLink href={reportUrl("certificates")} label="Certificate register" />
          <ExportLink href="/api/v1/certificate-issues/export" label="Certificate audit CSV" />
          <ExportLink href={reportUrl("library", { report: "inventory" })} label="Library inventory" />
          <ExportLink href={reportUrl("library", { report: "circulation" })} label="Library circulation" />
          <ExportLink href={reportUrl("transport", { report: "fleet" })} label="Transport fleet" />
          <ExportLink href={reportUrl("transport", { report: "routes" })} label="Transport routes" />
          <ExportLink href={reportUrl("transport", { report: "students" })} label="Transport students" />
          <ExportLink href="/api/v1/system/export" label="School data snapshot" />
        </ExportGroup>

        <ExportGroup
          title="Individual fee ledger"
          icon={FileSpreadsheet}
          className="lg:col-span-3"
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,0.75fr)]">
            <SearchableStudentSelect
              value={studentId}
              onChange={(value) => {
                setStudentId(value);
                setStudentFees([]);
                setStudentFeeId("");
              }}
              academicYearId={filters.academicYearId}
            />

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-semibold">Ledger export</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Choose a student and assigned fee plan to download the
                  individual ledger.
                </p>
              </div>

              {studentFees.length > 1 ? (
                <Select value={studentFeeId} onValueChange={setStudentFeeId}>
                  <SelectTrigger><SelectValue placeholder="Select fee plan" /></SelectTrigger>
                  <SelectContent>{studentFees.map((fee) => <SelectItem key={fee.id} value={fee.id}>{fee.feePlan?.name ?? "Fee ledger"}</SelectItem>)}</SelectContent>
                </Select>
              ) : null}

              <ExportLink href={studentFeeId ? `/api/v1/reports/${schoolSlug}/fees/students/${studentFeeId}/ledger` : "#"} label="Export student ledger" disabled={!studentFeeId} />
            </div>
          </div>
        </ExportGroup>
      </div>
    </section>
  );
}
