import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParentQueryActions } from "./parent-query-actions";

export default async function ParentQueryDetailPage({ params }: { params: Promise<{ schoolSlug: string; id: string }> }) {
  const { schoolSlug, id } = await params;
  const membership = await requireMembership(schoolSlug);
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) notFound();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, schoolId: membership.schoolId, source: "PARENT_QR" },
    select: {
      id: true, ticketNo: true, subject: true, description: true,
      type: true, status: true, createdAt: true, parentName: true, parentPhone: true,
      student: {
        select: {
          fullName: true,
          enrollments: {
            where: { active: true, academicYear: { active: true } },
            take: 1,
            select: { class: { select: { name: true } }, section: { select: { name: true } } },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!ticket) notFound();
  const enrollment = ticket.student?.enrollments[0];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link href={`/${schoolSlug}/parent-queries`} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline">
        <ArrowLeft className="size-4" /> Back to parent queries
      </Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="font-semibold text-indigo-700">{ticket.ticketNo}</span>
          <span>·</span>
          <span>{ticket.createdAt.toLocaleString("en-IN")}</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">PARENT QUERY</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">{ticket.subject}</h1>
        <p className="mt-2 text-sm text-slate-600">Category: {ticket.type.replaceAll("_", " ")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Internal notes</h2>
            <p className="mt-1 text-xs text-slate-500">Notes in School Support are visible to staff, not sent to the parent.</p>
            <div className="mt-5 space-y-4">
              {ticket.messages.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
              {ticket.messages.map((message) => <div key={message.id} className="rounded-xl bg-slate-50 p-4">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">
                    {[message.author.firstName, message.author.lastName].filter(Boolean).join(" ") || "Staff"}
                  </span>
                  <span>{message.createdAt.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
              </div>)}
            </div>
            <ParentQueryActions ticketId={ticket.id} schoolSlug={schoolSlug} status={ticket.status} showNotes />
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Student and contact</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-slate-500">Student</dt><dd className="mt-1 font-semibold">{ticket.student?.fullName || "Student"}</dd></div>
              <div><dt className="text-slate-500">Class and section</dt><dd className="mt-1 font-semibold">{[enrollment?.class.name, enrollment?.section.name].filter(Boolean).join(" · ") || "Not available"}</dd></div>
              <div><dt className="text-slate-500">Parent name</dt><dd className="mt-1 font-semibold">{ticket.parentName || "Not provided"}</dd></div>
              <div><dt className="text-slate-500">Follow-up phone</dt><dd className="mt-1 font-semibold">
                {ticket.parentPhone ? <a href={`tel:${ticket.parentPhone}`} className="text-indigo-700 hover:underline">{ticket.parentPhone}</a> : "Not provided"}
              </dd></div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="font-bold text-slate-950">Status</h2>
            <ParentQueryActions key={ticket.status} ticketId={ticket.id} schoolSlug={schoolSlug} status={ticket.status} />
          </section>
        </div>
      </div>
    </div>
  );
}
