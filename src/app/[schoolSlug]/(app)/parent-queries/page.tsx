import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Inbox,
  MessageSquareText,
  Printer,
  Search,
  Sparkles,
  TimerReset,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ schoolSlug: string }>;
type Query = Promise<{ status?: string; q?: string; page?: string }>;

const filters = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "ACTIVE", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

function statusWhere(status: string): Prisma.SupportTicketWhereInput {
  if (status === "OPEN") return { status: { in: ["OPEN", "REOPENED"] } };
  if (status === "ACTIVE") return { status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } };
  if (status === "RESOLVED") return { status: { in: ["RESOLVED", "CLOSED"] } };
  return {};
}

function listHref(schoolSlug: string, status: string, q: string, page = 1) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return `/${schoolSlug}/parent-queries${params.size ? `?${params}` : ""}`;
}

export default async function ParentQueriesPage({ params, searchParams }: { params: Params; searchParams: Query }) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) notFound();
  const query = await searchParams;
  const status = filters.some((item) => item.value === query.status) ? query.status! : "ALL";
  const q = query.q?.trim().slice(0, 80) || "";
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const pageSize = 25;
  const where: Prisma.SupportTicketWhereInput = {
    schoolId: membership.schoolId,
    source: "PARENT_QR",
    ...statusWhere(status),
    ...(q ? { OR: [
      { ticketNo: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { student: { is: { fullName: { contains: q, mode: "insensitive" } } } },
    ] } : {}),
  };
  const [tickets, total, open, active, resolved] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, ticketNo: true, subject: true, type: true, status: true,
        parentName: true, createdAt: true,
        student: { select: { fullName: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { schoolId: membership.schoolId, source: "PARENT_QR", status: { in: ["OPEN", "REOPENED"] } } }),
    prisma.supportTicket.count({ where: { schoolId: membership.schoolId, source: "PARENT_QR", status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } } }),
    prisma.supportTicket.count({ where: { schoolId: membership.schoolId, source: "PARENT_QR", status: { in: ["RESOLVED", "CLOSED"] } } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageContainer>
      <PageHeader
        title="Parent Queries"
        description="Review requests submitted through your school’s public parent QR form."
        actions={
          <Button asChild>
            <Link href={`/${schoolSlug}/parent-query/qr`} target="_blank" rel="noopener noreferrer">
              <Printer className="size-4" /> Print parent QR
            </Link>
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><MessageSquareText className="size-5" /></div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-3" />Parent support</div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">QR requests, organized for action</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Parents can raise a query without signing in. Your team can review every request and track it through resolution.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ParentMetric icon={CircleDot} label="Open" value={open} tone="text-amber-600" />
            <ParentMetric icon={TimerReset} label="In progress" value={active} tone="text-primary" />
            <ParentMetric icon={CheckCircle2} label="Resolved" value={resolved} tone="text-emerald-600" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search className="size-4" /></div>
          <div><h2 className="text-sm font-bold">Find parent queries</h2><p className="mt-0.5 text-xs text-muted-foreground">Search by ticket, subject, or student.</p></div>
        </div>
        <form action={`/${schoolSlug}/parent-queries`} className="grid gap-3 p-4 sm:grid-cols-[minmax(240px,1fr)_120px]">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <div className="relative min-w-0"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input name="q" defaultValue={q} maxLength={80} aria-label="Search parent queries" placeholder="Search ticket, subject or student" className="h-11 w-full rounded-xl border border-border/70 bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></div>
          <Button type="submit" className="h-11"><Search className="size-4" />Search</Button>
        </form>
        <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/20 px-4 py-3">
          {filters.map((item) => <Link key={item.value} href={listHref(schoolSlug, item.value, q)} aria-current={status === item.value ? "page" : undefined} className={`rounded-full px-4 py-2 text-xs font-bold transition ${status === item.value ? "bg-primary text-primary-foreground shadow-sm" : "border border-border/70 bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground"}`}>{item.label}</Link>)}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Inbox className="size-4" /></div><div><h2 className="text-sm font-bold">Parent query inbox</h2><p className="mt-0.5 text-xs text-muted-foreground">Latest QR submissions appear first.</p></div></div>
          <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-bold">{total} {total === 1 ? "query" : "queries"}</span>
        </div>
        {tickets.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Inbox className="size-6" /></div><h3 className="mt-4 font-bold">No parent queries match this view</h3><p className="mt-1 text-sm text-muted-foreground">Change the filter or share the parent QR with families.</p></div>
        ) : (
          <div className="divide-y divide-border/60">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/${schoolSlug}/parent-queries/${ticket.id}`} className="group flex flex-col gap-4 p-5 transition hover:bg-primary/[0.025] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary"><UserRound className="size-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground"><span className="font-bold text-primary">{ticket.ticketNo}</span><span>·</span><span>{ticket.type.replaceAll("_", " ")}</span><span>·</span><span>{ticket.createdAt.toLocaleDateString("en-IN")}</span></div><h3 className="mt-1.5 truncate font-bold text-foreground">{ticket.subject}</h3><p className="mt-1 truncate text-sm text-muted-foreground">{ticket.student?.fullName || "Student"}{ticket.parentName ? ` · From ${ticket.parentName}` : ""}</p></div></div>
                <div className="flex shrink-0 items-center gap-3 pl-[3.75rem] sm:pl-0"><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{ticket.status.replaceAll("_", " ")}</span><ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {totalPages > 1 && <nav aria-label="Query pages" className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm">
        {page > 1 ? <Button asChild variant="outline"><Link href={listHref(schoolSlug, status, q, page - 1)}>Previous</Link></Button> : <span />}
        <span className="font-medium text-muted-foreground">Page {page} of {totalPages}</span>
        {page < totalPages ? <Button asChild variant="outline"><Link href={listHref(schoolSlug, status, q, page + 1)}>Next</Link></Button> : <span />}
      </nav>}
    </PageContainer>
  );
}

function ParentMetric({ icon: Icon, label, value, tone }: { icon: typeof CircleDot; label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm backdrop-blur-sm sm:p-4"><Icon className={`size-4 ${tone}`} /><p className="mt-2 text-2xl font-black text-foreground">{value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}
