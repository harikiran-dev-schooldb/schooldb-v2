import { CalendarClock, CalendarDays, CircleCheckBig, Clock3, MessageSquareText, Sparkles } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { LeaveDecisionControl } from "@/features/leave-requests/LeaveDecisionControl";
import { listStaffLeaveRequests } from "@/features/leave-requests/service";
import { formatDate } from "@/lib/self-service-format";

const statusStyle: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};

export default async function LeaveRequestsManagementPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const requests = await listStaffLeaveRequests(schoolSlug);
  const pending = requests.filter((request) => request.status === "PENDING");
  const completed = requests.filter((request) => request.status !== "PENDING");

  return (
    <PageContainer>
      <PageHeader title="Leave requests" description="Review student absences. Teachers only see requests from their assigned classes and sections." />

      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-[0_28px_70px_rgba(30,27,75,0.25)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-200"><Sparkles className="size-3.5" />Student care desk</div><h2 className="mt-3 max-w-lg text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Every absence, reviewed with clarity.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">Approve or reject requests with a clear note that families can see immediately.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><Clock3 className="size-5 text-amber-300" /><p className="mt-3 text-3xl font-black">{pending.length}</p><p className="text-xs font-medium text-indigo-100">Awaiting decision</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><CircleCheckBig className="size-5 text-emerald-300" /><p className="mt-3 text-3xl font-black">{completed.length}</p><p className="text-xs font-medium text-indigo-100">Decisions recorded</p></div>
          </div>
        </div>
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
          <p className="mt-3 font-semibold">No pending leave requests</p>
          <p className="mt-1 text-sm text-muted-foreground">New student requests will appear here.</p>
        </div>
      )}
      {requests.map((request) => {
        const studentName = request.student.fullName || `Student ${request.student.admissionNo}`;
        return (
          <article key={request.id} className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_55px_rgba(79,70,229,0.1)] sm:p-6">
            <div className={`absolute inset-y-0 left-0 w-1.5 ${request.status === "APPROVED" ? "bg-emerald-400" : request.status === "PENDING" ? "bg-amber-400" : request.status === "REJECTED" ? "bg-rose-400" : "bg-slate-300"}`} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 font-black text-indigo-700 ring-1 ring-indigo-100">{studentName.split(" ").slice(0,2).map((part) => part[0]).join("")}</div>
                <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{studentName}</h3>
                  <Badge variant="outline" className={statusStyle[request.status]}>{request.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Admission {request.student.admissionNo} · {request.enrollment.class.name} {request.enrollment.section.name}{request.enrollment.rollNo ? ` · Roll ${request.enrollment.rollNo}` : ""}</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-indigo-500" />{formatDate(request.startDate)}{request.endDate.getTime() !== request.startDate.getTime() ? ` – ${formatDate(request.endDate)}` : ""}</p>
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
