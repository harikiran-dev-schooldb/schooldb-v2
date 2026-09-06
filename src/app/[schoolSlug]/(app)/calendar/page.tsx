import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { PublicationStatusControl } from "@/features/audiences/PublicationStatusControl";
import { CalendarEventForm } from "@/features/calendar/CalendarEventForm";
import { setCalendarEventArchived } from "@/features/calendar/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/self-service-format";

export default async function CalendarManagementPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const [academicYear, events] = await Promise.all([
    prisma.academicYear.findFirst({ where: { schoolId: membership.schoolId, active: true }, select: { id: true }, orderBy: { startDate: "desc" } }),
    prisma.schoolCalendarEvent.findMany({ where: { schoolId: membership.schoolId }, orderBy: [{ startDate: "desc" }, { createdAt: "desc" }], take: 200 }),
  ]);
  return (
    <PageContainer>
      <PageHeader title="School calendar" description="Publish holidays, exams, fee deadlines, meetings, and school events." />
      <CalendarEventForm schoolSlug={schoolSlug} academicYearId={academicYear?.id ?? null} />
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">Calendar events <span className="text-sm font-normal text-muted-foreground">(latest 200)</span></h2>
        {events.length === 0 && <p className="rounded-2xl border p-8 text-center text-muted-foreground">No calendar events yet.</p>}
        {events.map((event) => (
          <article key={event.id} className="space-y-3 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2"><Badge>{event.category.replaceAll("_", " ")}</Badge><Badge variant="outline">{event.targetLabel}</Badge>{event.archived && <Badge variant="outline">Archived</Badge>}</div>
            <h3 className="font-bold">{event.title}</h3>
            {event.description && <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description}</p>}
            <p className="text-xs text-muted-foreground">{formatDate(event.startDate)}{event.endDate.getTime() !== event.startDate.getTime() ? ` – ${formatDate(event.endDate)}` : ""}</p>
            <PublicationStatusControl title={event.title} archived={event.archived} action={setCalendarEventArchived.bind(null, schoolSlug, event.id)} />
          </article>
        ))}
      </div>
    </PageContainer>
  );
}
