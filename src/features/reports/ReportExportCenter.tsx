"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  Check,
  ChevronRight,
  Download,
  FileJson,
  FileSpreadsheet,
  GraduationCap,
  IndianRupee,
  Search,
  School,
  ShieldCheck,
} from "lucide-react";

import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportExportButton } from "@/features/reports/ReportExportButton";
import { cn } from "@/lib/utils";

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

type StudentFeeOption = { id: string; feePlan?: { name?: string } };
type Category = "PEOPLE" | "ATTENDANCE" | "FINANCE" | "OPERATIONS";
type ReportId =
  | "school-summary" | "student-master" | "teacher-master" | "exam-results"
  | "class-attendance" | "fee-term" | "fee-collection" | "fee-outstanding"
  | "payment-history" | "expenses" | "payroll" | "student-ledger"
  | "leave-permissions" | "certificate-register" | "certificate-audit"
  | "library-inventory" | "library-circulation" | "transport-fleet"
  | "transport-routes" | "transport-students" | "school-snapshot";

type ReportDefinition = {
  id: ReportId;
  category: Category;
  title: string;
  description: string;
  format: "XLSX" | "CSV" | "JSON";
};

const categories: Array<{ id: Category; label: string; icon: typeof GraduationCap }> = [
  { id: "PEOPLE", label: "People & academics", icon: GraduationCap },
  { id: "ATTENDANCE", label: "Attendance", icon: CalendarCheck2 },
  { id: "FINANCE", label: "Fees & finance", icon: IndianRupee },
  { id: "OPERATIONS", label: "Operations", icon: School },
];

const reports: ReportDefinition[] = [
  { id: "school-summary", category: "PEOPLE", title: "School summary", description: "A private overview of students, staff, attendance and finance.", format: "CSV" },
  { id: "student-master", category: "PEOPLE", title: "Student master report", description: "Student register for the selected academic scope and status.", format: "XLSX" },
  { id: "teacher-master", category: "PEOPLE", title: "Teacher master report", description: "Current staff register with employment information.", format: "XLSX" },
  { id: "exam-results", category: "PEOPLE", title: "Exam results report", description: "Results for one exam and the selected class roster.", format: "XLSX" },
  { id: "class-attendance", category: "ATTENDANCE", title: "Class attendance report", description: "Section attendance across the selected date range.", format: "XLSX" },
  { id: "fee-term", category: "FINANCE", title: "Fee term summary", description: "Assigned, paid and outstanding totals by fee term.", format: "XLSX" },
  { id: "fee-collection", category: "FINANCE", title: "Fee collection summary", description: "Collection totals for the selected date range.", format: "XLSX" },
  { id: "fee-outstanding", category: "FINANCE", title: "Outstanding fees", description: "Current balances for active students.", format: "XLSX" },
  { id: "payment-history", category: "FINANCE", title: "Payment history", description: "Historical payment audit register for the selected dates.", format: "XLSX" },
  { id: "expenses", category: "FINANCE", title: "Expense report", description: "Recorded school expenses for the selected dates.", format: "XLSX" },
  { id: "payroll", category: "FINANCE", title: "Current-month payroll", description: "Payroll register for the current calendar month.", format: "CSV" },
  { id: "student-ledger", category: "FINANCE", title: "Individual fee ledger", description: "Complete fee ledger for one student and fee plan.", format: "XLSX" },
  { id: "leave-permissions", category: "OPERATIONS", title: "Leave and permissions", description: "Student and staff leave activity for the selected dates.", format: "XLSX" },
  { id: "certificate-register", category: "OPERATIONS", title: "Certificate register", description: "Certificate records within the selected scope.", format: "XLSX" },
  { id: "certificate-audit", category: "OPERATIONS", title: "Certificate audit", description: "Issue-level certificate audit trail.", format: "CSV" },
  { id: "library-inventory", category: "OPERATIONS", title: "Library inventory", description: "Current book and copy inventory.", format: "XLSX" },
  { id: "library-circulation", category: "OPERATIONS", title: "Library circulation", description: "Issue, return and circulation records.", format: "XLSX" },
  { id: "transport-fleet", category: "OPERATIONS", title: "Transport fleet", description: "Vehicle and fleet register.", format: "XLSX" },
  { id: "transport-routes", category: "OPERATIONS", title: "Transport routes", description: "Route, stop and assignment details.", format: "XLSX" },
  { id: "transport-students", category: "OPERATIONS", title: "Transport students", description: "Students currently assigned to transport.", format: "XLSX" },
  { id: "school-snapshot", category: "OPERATIONS", title: "School data snapshot", description: "School-scoped operational data archive.", format: "JSON" },
];

function FormatBadge({ format }: { format: ReportDefinition["format"] }) {
  const Icon = format === "JSON" ? FileJson : FileSpreadsheet;
  return (
    <Badge variant="outline" className="gap-1 rounded-lg bg-white text-[10px] font-bold tracking-wide text-slate-500">
      <Icon className="size-3" />{format}
    </Badge>
  );
}

export function ReportExportCenter({ schoolSlug, filters, exams }: Props) {
  const [category, setCategory] = useState<Category>("PEOPLE");
  const [selectedReportId, setSelectedReportId] = useState<ReportId>("school-summary");
  const [search, setSearch] = useState("");
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [studentStatus, setStudentStatus] = useState("ACTIVE");
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

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => report.category === category && (!term || `${report.title} ${report.description} ${report.format}`.toLowerCase().includes(term)));
  }, [category, search]);
  const selectedReport = visibleReports.find((report) => report.id === selectedReportId) ?? visibleReports[0] ?? null;

  function changeCategory(next: string) {
    const nextCategory = next as Category;
    setCategory(nextCategory);
    setSearch("");
    const first = reports.find((report) => report.category === nextCategory);
    if (first) setSelectedReportId(first.id);
  }

  function changeStudent(value: string) {
    setStudentId(value);
    setStudentFees([]);
    setStudentFeeId("");
  }

  const now = new Date();
  const attendanceReady = Boolean(filters.academicYearId && filters.classId && filters.sectionId);
  const examReady = Boolean(examId && filters.classId);
  const ledgerReady = Boolean(studentFeeId);

  function hrefFor(report: ReportDefinition) {
    switch (report.id) {
      case "student-master": return reportUrl("students", { status: studentStatus });
      case "teacher-master": return reportUrl("teachers");
      case "exam-results": return examId ? reportUrl(`exams/${examId}/results`) : "#";
      case "class-attendance": return reportUrl("attendance/class");
      case "fee-term": return reportUrl("fees/term-summary");
      case "fee-collection": return reportUrl("fees/collection-summary");
      case "fee-outstanding": return reportUrl("fees/outstanding");
      case "payment-history": return reportUrl("fees/payments");
      case "expenses": return reportUrl("expenses");
      case "payroll": return `/api/v1/operations?kind=payroll-report&year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
      case "student-ledger": return studentFeeId ? `/api/v1/reports/${schoolSlug}/fees/students/${studentFeeId}/ledger` : "#";
      case "leave-permissions": return reportUrl("leave-permissions", { from: filters.from, to: filters.to });
      case "certificate-register": return reportUrl("certificates");
      case "certificate-audit": return "/api/v1/certificate-issues/export";
      case "library-inventory": return reportUrl("library", { report: "inventory" });
      case "library-circulation": return reportUrl("library", { report: "circulation" });
      case "transport-fleet": return reportUrl("transport", { report: "fleet" });
      case "transport-routes": return reportUrl("transport", { report: "routes" });
      case "transport-students": return reportUrl("transport", { report: "students" });
      case "school-snapshot": return "/api/v1/system/export";
      default: return "#";
    }
  }

  function readinessFor(report: ReportDefinition) {
    if (report.id === "school-summary") return { ready: Boolean(filters.academicYearId), message: "Select an academic year above." };
    if (report.id === "class-attendance") return { ready: attendanceReady, message: "Select a class and section in Report filters." };
    if (report.id === "exam-results") return { ready: examReady, message: "Select a class above and an exam here." };
    if (report.id === "student-ledger") return { ready: ledgerReady, message: "Choose a student with an assigned fee plan." };
    return { ready: true, message: "" };
  }

  async function startDirectDownload(report: ReportDefinition, href: string) {
    const needsClientAudit = report.id === "payroll" || report.id === "certificate-audit";
    try {
      if (needsClientAudit) {
        await fetch("/api/v1/report-downloads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: report.id }),
        });
      }
    } finally {
      const download = document.createElement("a");
      download.href = href;
      download.download = "";
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => {
        window.dispatchEvent(new Event("schooldb:report-exported"));
      }, 1200);
    }
  }

  return (
    <section className="mt-6 print:hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Centralized downloads</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Report export center</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Choose a report, review its scope, and export it in the available format.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4 text-emerald-600" />Private and audited exports</div>
      </div>

      <Card className="overflow-hidden rounded-[24px] border-slate-200/80 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.35)]">
        <CardContent className="p-0">
          <div className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <Tabs value={category} onValueChange={changeCategory} className="overflow-x-auto">
                <TabsList className="w-max">
                  {categories.map(({ id, label, icon: Icon }) => (
                    <TabsTrigger key={id} value={id} className="gap-2"><Icon className="size-4" />{label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative w-full xl:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." className="h-11 rounded-xl bg-white pl-9" />
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="min-w-0 p-4 sm:p-5 lg:p-6">
              {visibleReports.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleReports.map((report) => {
                    const selected = report.id === selectedReport?.id;
                    return (
                      <button key={report.id} type="button" onClick={() => setSelectedReportId(report.id)} className={cn("group flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left transition-all", selected ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/10" : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm") }>
                        <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600")}>{selected ? <Check className="size-4" /> : <FileSpreadsheet className="size-4" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2"><span className="font-bold text-slate-900">{report.title}</span><FormatBadge format={report.format} /></span>
                          <span className="mt-1.5 block text-xs leading-5 text-slate-500">{report.description}</span>
                        </span>
                        <ChevronRight className={cn("mt-2 size-4 shrink-0", selected ? "text-indigo-600" : "text-slate-300")} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-center">
                  <Search className="size-6 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-700">No reports found</p><p className="mt-1 text-xs text-slate-500">Try a different report name or format.</p>
                </div>
              )}
            </div>

            <aside className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 xl:border-l xl:border-t-0 xl:p-6">
              {selectedReport ? (
                <ExportPanel report={selectedReport} filters={filters} ready={readinessFor(selectedReport).ready} requirement={readinessFor(selectedReport).message} href={hrefFor(selectedReport)} query={query.toString()} onDirectDownload={startDirectDownload} exams={exams} examId={examId} onExamChange={setExamId} studentStatus={studentStatus} onStudentStatusChange={setStudentStatus} studentId={studentId} onStudentChange={changeStudent} studentFees={studentFees} studentFeeId={studentFeeId} onStudentFeeChange={setStudentFeeId} />
              ) : (
                <div className="flex min-h-60 items-center justify-center text-sm text-slate-500">Select a report to continue.</div>
              )}
            </aside>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ExportPanel({ report, filters, ready, requirement, href, query, onDirectDownload, exams, examId, onExamChange, studentStatus, onStudentStatusChange, studentId, onStudentChange, studentFees, studentFeeId, onStudentFeeChange }: {
  report: ReportDefinition;
  filters: Props["filters"];
  ready: boolean;
  requirement: string;
  href: string;
  query: string;
  onDirectDownload: (report: ReportDefinition, href: string) => Promise<void>;
  exams: Props["exams"];
  examId: string;
  onExamChange: (value: string) => void;
  studentStatus: string;
  onStudentStatusChange: (value: string) => void;
  studentId: string;
  onStudentChange: (value: string) => void;
  studentFees: StudentFeeOption[];
  studentFeeId: string;
  onStudentFeeChange: (value: string) => void;
}) {
  return (
    <div className="xl:sticky xl:top-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Export setup</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-black tracking-tight text-slate-950">{report.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{report.description}</p></div>
        <FormatBadge format={report.format} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Applied scope</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <ScopeItem label="Academic year" value={filters.academicYearId ? "Selected" : "Required"} />
          <ScopeItem label="Class" value={filters.classId ? "Selected" : "All classes"} />
          <ScopeItem label="Section" value={filters.sectionId ? "Selected" : "All sections"} />
          <ScopeItem label="Dates" value={filters.from && filters.to ? `${formatShortDate(filters.from)} – ${formatShortDate(filters.to)}` : "Not selected"} />
        </div>
      </div>

      {report.id === "student-master" ? (
        <Field label="Student status"><Select value={studentStatus} onValueChange={onStudentStatusChange}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem><SelectItem value="TC_ISSUED">TC issued</SelectItem><SelectItem value="ALUMNI">Alumni</SelectItem><SelectItem value="DROPPED">Dropped</SelectItem><SelectItem value="NOT_COMING">Not coming</SelectItem></SelectContent></Select></Field>
      ) : null}

      {report.id === "exam-results" ? (
        <Field label="Exam"><Select value={examId} onValueChange={onExamChange}><SelectTrigger className="bg-white"><SelectValue placeholder="Select exam" /></SelectTrigger><SelectContent>{exams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>)}</SelectContent></Select></Field>
      ) : null}

      {report.id === "student-ledger" ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SearchableStudentSelect value={studentId} onChange={onStudentChange} academicYearId={filters.academicYearId} />
          {studentFees.length > 1 ? (
            <Field label="Assigned fee plan" className="mt-0"><Select value={studentFeeId} onValueChange={onStudentFeeChange}><SelectTrigger><SelectValue placeholder="Select fee plan" /></SelectTrigger><SelectContent>{studentFees.map((fee) => <SelectItem key={fee.id} value={fee.id}>{fee.feePlan?.name ?? "Fee ledger"}</SelectItem>)}</SelectContent></Select></Field>
          ) : null}
        </div>
      ) : null}

      {!ready ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">{requirement}</div> : null}

      {report.id === "school-summary" ? (
        ready ? (
          <ReportExportButton query={query} label="Prepare private CSV" className="mt-5 h-11 w-full justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" />
        ) : (
          <Button disabled className="mt-5 h-11 w-full rounded-xl"><Download className="size-4" />Prepare private CSV</Button>
        )
      ) : (
        <Button disabled={!ready} onClick={() => void onDirectDownload(report, href)} className="mt-5 h-11 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700">
          <Download className="size-4" />Export {report.format}
        </Button>
      )}
      <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">The download is private, permission-checked and recorded in the audit log.</p>
    </div>
  );
}

function ScopeItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate font-semibold text-slate-700">{value}</p></div>;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={cn("mt-5 block space-y-1.5 text-xs font-bold text-slate-600", className)}>{label}{children}</label>;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}
