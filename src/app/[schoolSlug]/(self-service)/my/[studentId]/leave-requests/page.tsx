import { CalendarClock, CalendarDays, CheckCircle2, Clock3, MessageSquareText, XCircle } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { CancelLeaveRequest } from "@/features/leave-requests/CancelLeaveRequest";
import { LeaveRequestForm } from "@/features/leave-requests/LeaveRequestForm";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

const statusStyle: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};

const statusIcon = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: XCircle,
};

export default async function StudentLeaveRequestsPage({ params }: { params: Promise<{ schoolSlug: string; studentId: string }> }) {
  const { schoolSlug, studentId } = await params;
  const context = await requireStudentAccess(schoolSlug, studentId);
  const requests = await prisma.leaveRequest.findMany({
    where: { schoolId: context.membership.schoolId, studentId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <SelfServicePage title="Leave requests" description="Request an absence and follow the school’s decision.">
      <LeaveRequestForm schoolSlug={schoolSlug} studentId={studentId} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Your requests</p><h2 className="mt-1 text-xl font-bold tracking-[-0.02em]">Leave history</h2></div>
          {requests.length > 0 && <div className="rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">{requests.length} total</div>}
        </div>
        <div>
          <p className="mt-1 text-sm text-muted-foreground">Approved leave is recorded here for reference; attendance remains based on the school’s daily register.</p>
        </div>
        {requests.length === 0 ? (
          <SelfServiceEmptyState icon={CalendarClock} title="No leave requests" description="Your submitted requests and their status will appear here." />
        ) : (
          requests.map((request) => {
            const StatusIcon = statusIcon[request.status as keyof typeof statusIcon] ?? Clock3;
            const duration = Math.floor((request.endDate.getTime() - request.startDate.getTime()) / 86_400_000) + 1;
            return (
            <article key={request.id} className="group relative overflow-hidden rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(79,70,229,0.1)] sm:p-6">
              <div className={`absolute inset-y-0 left-0 w-1.5 ${request.status === "APPROVED" ? "bg-emerald-400" : request.status === "PENDING" ? "bg-amber-400" : request.status === "REJECTED" ? "bg-rose-400" : "bg-slate-300"}`} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><CalendarDays className="size-5" /></div>
                  <div>
                  <p className="font-bold tracking-[-0.01em]">{formatDate(request.startDate)}{request.endDate.getTime() !== request.startDate.getTime() ? ` – ${formatDate(request.endDate)}` : ""}</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-600">{duration} {duration === 1 ? "day" : "days"} leave</p>
                  <p className="mt-1 text-xs text-muted-foreground">Requested {formatDate(request.createdAt)}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`gap-1.5 rounded-full px-3 py-1 ${statusStyle[request.status]}`}><StatusIcon className="size-3.5" />{request.status}</Badge>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Reason for leave</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.reason}</p></div>
              {request.decisionNote && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><MessageSquareText className="size-4" />School decision note</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{request.decisionNote}</p>
                </div>
              )}
              {request.status === "PENDING" && <div className="mt-4"><CancelLeaveRequest schoolSlug={schoolSlug} studentId={studentId} requestId={request.id} /></div>}
            </article>
          );})
        )}
      </section>
    </SelfServicePage>
  );
}
