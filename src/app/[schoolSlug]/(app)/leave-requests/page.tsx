import Link from "next/link";
import { CalendarClock, CalendarDays, CircleCheckBig, Clock3, Download, MessageSquareText, Sparkles } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LeaveDecisionControl } from "@/features/leave-requests/LeaveDecisionControl";
import { leaveRequestFilterOptions, listStaffLeaveRequests } from "@/features/leave-requests/service";
import { formatDate } from "@/lib/self-service-format";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};

const requestTypeLabel: Record<string, string> = {
  LEAVE: "Leave",
  LATE_ARRIVAL: "Late arrival",
  EARLY_DEPARTURE: "Early departure",
  HALF_DAY: "Half day",
  PERMISSION: "Permission",
};

const requestTypeStyle: Record<string, string> = {
  LEAVE: "border-indigo-200 bg-indigo-50 text-indigo-700",
  LATE_ARRIVAL: "border-amber-200 bg-amber-50 text-amber-800",
  EARLY_DEPARTURE: "border-orange-200 bg-orange-50 text-orange-800",
  HALF_DAY: "border-sky-200 bg-sky-50 text-sky-800",
  PERMISSION: "border-violet-200 bg-violet-50 text-violet-800",
};

const filterTypes = ["ALL", "LEAVE", "LATE_ARRIVAL", "EARLY_DEPARTURE", "HALF_DAY", "PERMISSION"] as const;

function requestTime(request: { requestType: string; startTime: string | null; endTime: string | null }) {
  if (request.requestType === "LATE_ARRIVAL" && request.startTime) return `Expected arrival: ${request.startTime}`;
  if (request.requestType === "EARLY_DEPARTURE" && request.startTime) return `Departure: ${request.startTime}`;
  if (request.requestType === "PERMISSION") {
    if (request.startTime && request.endTime) return `${request.startTime} – ${request.endTime}`;
    return request.startTime || request.endTime;
  }
  return null;
}

export default async function LeaveRequestsManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ type?: string; classId?: string; sectionId?: string; from?: string; to?: string }>;
}) {
  const { schoolSlug } = await params;
  const query = await searchParams;
  const selectedType = filterTypes.includes(query.type as (typeof filterTypes)[number]) ? query.type! : "ALL";
  const [allRequests, filterOptions] = await Promise.all([
    listStaffLeaveRequests(schoolSlug, { classId: query.classId, sectionId: query.sectionId, from: query.from, to: query.to }),
    leaveRequestFilterOptions(schoolSlug),
  ]);
  const availableSections = query.classId ? filterOptions.sections.filter((section) => section.classId === query.classId) : filterOptions.sections;
  const requests = selectedType === "ALL" ? allRequests : allRequests.filter((request) => request.requestType === selectedType);
  const pending = requests.filter((request) => request.status === "PENDING");
  const completed = requests.filter((request) => request.status !== "PENDING");
  const exportQuery = new URLSearchParams();
  if (selectedType !== "ALL") exportQuery.set("type", selectedType);
  if (query.classId) exportQuery.set("classId", query.classId);
  if (query.sectionId) exportQuery.set("sectionId", query.sectionId);
  if (query.from) exportQuery.set("from", query.from);
  if (query.to) exportQuery.set("to", query.to);
  const exportHref = `/api/v1/reports/${schoolSlug}/leave-permissions${exportQuery.size ? `?${exportQuery.toString()}` : ""}`;

  return (
    <PageContainer>
      <PageHeader title="Leave & permissions" description="Review student leave, late arrival, early departure, half-day and short permission requests. Teachers only see assigned classes and sections." />

      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-[0_28px_70px_rgba(30,27,75,0.25)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-200"><Sparkles className="size-3.5" />Student care desk</div><h2 className="mt-3 max-w-lg text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Every leave and permission request, in one place.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">Review the request type, date, applicable time and reason before recording a decision.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><Clock3 className="size-5 text-amber-300" /><p className="mt-3 text-3xl font-black">{pending.length}</p><p className="text-xs font-medium text-indigo-100">Awaiting decision</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><CircleCheckBig className="size-5 text-emerald-300" /><p className="mt-3 text-3xl font-black">{completed.length}</p><p className="text-xs font-medium text-indigo-100">Decisions recorded</p></div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-stretch sm:justify-end">
        <a href={exportHref} className={cn(buttonVariants(), "w-full sm:w-auto")}>
          <Download className="size-4" />Export Excel
        </a>
      </div>

      <form className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        {selectedType !== "ALL" && <input type="hidden" name="type" value={selectedType} />}
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">Class
          <select name="classId" defaultValue={query.classId ?? ""} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800">
            <option value="">All classes</option>
            {filterOptions.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">Section
          <select name="sectionId" defaultValue={query.sectionId ?? ""} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800">
            <option value="">All sections</option>
            {availableSections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">From date
          <input name="from" type="date" defaultValue={query.from ?? ""} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800" />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">To date
          <input name="to" type="date" defaultValue={query.to ?? ""} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="h-10 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">Apply</button>
          <Link href={selectedType === "ALL" ? `/${schoolSlug}/leave-requests` : `/${schoolSlug}/leave-requests?type=${selectedType}`} className="flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Clear</Link>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {filterTypes.map((filter) => {
          const active = selectedType === filter;
          const filterQuery = new URLSearchParams();
          if (filter !== "ALL") filterQuery.set("type", filter);
          if (query.classId) filterQuery.set("classId", query.classId);
          if (query.sectionId) filterQuery.set("sectionId", query.sectionId);
          if (query.from) filterQuery.set("from", query.from);
          if (query.to) filterQuery.set("to", query.to);
          const href = `/${schoolSlug}/leave-requests${filterQuery.size ? `?${filterQuery.toString()}` : ""}`;
          return <Link key={filter} href={href} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${active ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"}`}>{filter === "ALL" ? "All" : requestTypeLabel[filter]}</Link>;
        })}
      </div>

      <RequestList title="Pending requests" requests={pending} schoolSlug={schoolSlug} />
      {completed.length > 0 && <RequestList title="Recent decisions" requests={completed} schoolSlug={schoolSlug} />}
    </PageContainer>
  );
}

function RequestList({ title, requests, schoolSlug }: { title: string; requests: Awaited<ReturnType<typeof listStaffLeaveRequests>>; schoolSlug: string }) {
  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold tracking-[-0.02em]">{title}</h2><span className="rounded-full border bg-white px-3 py-1 text-xs font-bold text-muted-foreground shadow-sm">{requests.length}</span></div>
      {requests.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <CalendarClock className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No matching requests</p>
          <p className="mt-1 text-sm text-muted-foreground">New student leave and permission requests will appear here.</p>
        </div>
      )}
      {requests.map((request) => {
        const studentName = request.student.fullName || `Student ${request.student.admissionNo}`;
        const time = requestTime(request);
        return (
          <article key={request.id} className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_55px_rgba(79,70,229,0.1)] sm:p-6">
            <div className={`absolute inset-y-0 left-0 w-1.5 ${request.status === "APPROVED" ? "bg-emerald-400" : request.status === "PENDING" ? "bg-amber-400" : request.status === "REJECTED" ? "bg-rose-400" : "bg-slate-300"}`} />
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 font-black text-indigo-700 ring-1 ring-indigo-100">{studentName.split(" ").slice(0,2).map((part) => part[0]).join("")}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{studentName}</h3>
                    <Badge variant="outline" className={requestTypeStyle[request.requestType] ?? requestTypeStyle.LEAVE}>{requestTypeLabel[request.requestType] ?? "Leave"}</Badge>
                    <Badge variant="outline" className={statusStyle[request.status]}>{request.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Admission {request.student.admissionNo} · {request.enrollment.class.name} {request.enrollment.section.name}{request.enrollment.rollNo ? ` · Roll ${request.enrollment.rollNo}` : ""}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                    <span className="flex items-center gap-2"><CalendarDays className="size-4 text-indigo-500" />{formatDate(request.startDate)}{request.endDate.getTime() !== request.startDate.getTime() ? ` – ${formatDate(request.endDate)}` : ""}</span>
                    {time && <span className="flex items-center gap-2 text-violet-700"><Clock3 className="size-4" />{time}</span>}
                  </div>
                </div>
              </div>
              {request.status === "PENDING" && <LeaveDecisionControl schoolSlug={schoolSlug} requestId={request.id} studentName={studentName} />}
            </div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{request.reason}</p>
            </div>
            {request.decisionNote && (
              <div className="mt-3 flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Decision note</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{request.decisionNote}</p></div>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
