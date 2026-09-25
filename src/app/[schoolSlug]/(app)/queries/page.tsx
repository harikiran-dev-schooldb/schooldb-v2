import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ schoolSlug: string }>;
type Query = Promise<{ status?: string; q?: string; page?: string }>;

const VIEW_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"];

const filters = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "ACTIVE", label: "In progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

function statusWhere(status: string): Prisma.SupportTicketWhereInput {
  if (status === "OPEN") return { status: { in: ["OPEN", "REOPENED"] } };
  if (status === "ACTIVE") return { status: { in: ["ASSIGNED", "IN_PROGRESS"] } };
  if (status === "WAITING") return { status: "WAITING" };
  if (status === "RESOLVED") return { status: { in: ["RESOLVED", "CLOSED"] } };
  return {};
}

function listHref(schoolSlug: string, status: string, q: string, page = 1) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return `/${schoolSlug}/queries${params.size ? `?${params}` : ""}`;
}

export default async function QueriesPage({ params, searchParams }: { params: Params; searchParams: Query }) {
  const { schoolSlug } = await params;
  const membership = await requireMembership(schoolSlug);
  if (!VIEW_ROLES.includes(membership.role)) notFound();

  const query = await searchParams;
  const status = filters.some((item) => item.value === query.status) ? query.status! : "ALL";
  const q = query.q?.trim().slice(0, 100) || "";
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const pageSize = 25;

  const where: Prisma.SupportTicketWhereInput = {
    schoolId: membership.schoolId,
    ...statusWhere(status),
    ...(q
      ? {
          OR: [
            { ticketNo: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { parentName: { contains: q, mode: "insensitive" } },
            { student: { is: { fullName: { contains: q, mode: "insensitive" } } } },
            { student: { is: { admissionNo: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [tickets, total, open, active, resolved] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        ticketNo: true,
        subject: true,
        type: true,
        priority: true,
        status: true,
        source: true,
        parentName: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { admissionNo: true, fullName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        reads: { where: { userId: membership.userId }, select: { readAt: true }, take: 1 },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { schoolId: membership.schoolId, status: { in: ["OPEN", "REOPENED"] } } }),
    prisma.supportTicket.count({ where: { schoolId: membership.schoolId, status: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING"] } } }),
    prisma.supportTicket.count({ where: { schoolId: membership.schoolId, status: { in: ["RESOLVED", "CLOSED"] } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-sm font-semibold text-indigo-700">School Support</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Queries</h1>
        <p className="mt-2 text-sm text-slate-600">
          All support queries from the School Support Android app and parent query channels.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{open}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In progress</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{resolved}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action={`/${schoolSlug}/queries`} className="flex gap-2">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            maxLength={100}
            aria-label="Search queries"
            placeholder="Search ticket, subject, student, admission no or parent"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            <Search className="size-4" /> Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <Link
              key={item.value}
              href={listHref(schoolSlug, item.value, q)}
              aria-current={status === item.value ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${status === item.value ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-600">{total} {total === 1 ? "query" : "queries"}</p>
        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            No queries match this view.
          </div>
        ) : (
          tickets.map((ticket) => {
            const creator = [ticket.createdBy?.firstName, ticket.createdBy?.lastName].filter(Boolean).join(" ");
            const requester = ticket.parentName || creator || "School user";
            const unread = !ticket.reads[0] || ticket.updatedAt > ticket.reads[0].readAt;
            return (
              <Link
                key={ticket.id}
                href={`/${schoolSlug}/queries/${ticket.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>{ticket.ticketNo}</span>{unread && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Unread</span>}<span>·</span>
                    <span>{ticket.type.replaceAll("_", " ")}</span><span>·</span>
                    <span>{ticket.priority}</span><span>·</span>
                    <span>{ticket.createdAt.toLocaleDateString("en-IN")}</span>
                  </div>
                  <h2 className="mt-2 truncate font-semibold text-slate-950">{ticket.subject}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {ticket.student?.fullName || requester}
                    {ticket.student?.admissionNo ? ` · ${ticket.student.admissionNo}` : ""}
                    <span className="text-slate-400"> · {ticket.source.replaceAll("_", " ")}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {ticket.status.replaceAll("_", " ")}
                  </span>
                  <ArrowRight className="size-4 text-slate-400" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Query pages" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={listHref(schoolSlug, status, q, page - 1)} className="font-semibold text-indigo-700">Previous</Link> : <span />}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages ? <Link href={listHref(schoolSlug, status, q, page + 1)} className="font-semibold text-indigo-700">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
