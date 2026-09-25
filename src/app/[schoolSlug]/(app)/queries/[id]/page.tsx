import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QueryActions } from "./query-actions";

const VIEW_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"];
const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"];

export default async function QueryDetailPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; id: string }>;
}) {
  const { schoolSlug, id } = await params;
  const membership = await requireMembership(schoolSlug);
  if (!VIEW_ROLES.includes(membership.role)) notFound();

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, schoolId: membership.schoolId },
    select: {
      id: true,
      ticketNo: true,
      subject: true,
      description: true,
      type: true,
      priority: true,
      status: true,
      source: true,
      parentName: true,
      parentPhone: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      student: {
        select: {
          admissionNo: true,
          fullName: true,
          enrollments: {
            where: { active: true, academicYear: { active: true } },
            take: 1,
            select: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!ticket) notFound();

  const enrollment = ticket.student?.enrollments[0];
  const creator = [ticket.createdBy?.firstName, ticket.createdBy?.lastName].filter(Boolean).join(" ") || null;
  const assignee = [ticket.assignedTo?.firstName, ticket.assignedTo?.lastName].filter(Boolean).join(" ") || "Unassigned";
  const canReply = ADMIN_ROLES.includes(membership.role);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link href={`/${schoolSlug}/queries`} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" /> Back to queries
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="font-semibold text-indigo-700">{ticket.ticketNo}</span>
          <span>·</span>
          <span>{ticket.createdAt.toLocaleString("en-IN")}</span>
          <span>·</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {ticket.source.replaceAll("_", " ")}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">{ticket.subject}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{ticket.type.replaceAll("_", " ")}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{ticket.priority}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{ticket.status.replaceAll("_", " ")}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Query</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Conversation</h2>
            <p className="mt-1 text-xs text-slate-500">Replies are visible in the support workflow.</p>
            <div className="mt-5 space-y-4">
              {ticket.messages.length === 0 && <p className="text-sm text-slate-500">No replies yet.</p>}
              {ticket.messages.map((message) => {
                const author = [message.author.firstName, message.author.lastName].filter(Boolean).join(" ") || "School user";
                const fromAdmin = message.author.id === membership.userId;
                return (
                  <div key={message.id} className={`rounded-xl p-4 ${fromAdmin ? "bg-indigo-50" : "bg-slate-50"}`}>
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{author}</span>
                      <span>{message.createdAt.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Query details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-slate-500">Student</dt><dd className="mt-1 font-semibold">{ticket.student?.fullName || "Not linked"}</dd></div>
              <div><dt className="text-slate-500">Admission no.</dt><dd className="mt-1 font-semibold">{ticket.student?.admissionNo || "Not available"}</dd></div>
              <div><dt className="text-slate-500">Class and section</dt><dd className="mt-1 font-semibold">{[enrollment?.class.name, enrollment?.section.name].filter(Boolean).join(" · ") || "Not available"}</dd></div>
              <div><dt className="text-slate-500">Raised by</dt><dd className="mt-1 font-semibold">{ticket.parentName || creator || "School user"}</dd></div>
              <div><dt className="text-slate-500">Assigned to</dt><dd className="mt-1 font-semibold">{assignee}</dd></div>
              {ticket.parentPhone && <div><dt className="text-slate-500">Contact</dt><dd className="mt-1 font-semibold">{ticket.parentPhone}</dd></div>}
              <div><dt className="text-slate-500">Last updated</dt><dd className="mt-1 font-semibold">{ticket.updatedAt.toLocaleString("en-IN")}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">{canReply ? "Manage query" : "Query access"}</h2>
            {canReply ? (
              <div className="mt-4">
                <QueryActions ticketId={ticket.id} schoolSlug={schoolSlug} status={ticket.status} />
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                View only. Only Super Admin and School Admin can reply or change the query status.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
