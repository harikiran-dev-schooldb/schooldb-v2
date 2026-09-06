import { CalendarDays } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { listVisibleCalendarEvents } from "@/features/calendar/service";
import { formatDate } from "@/lib/self-service-format";

const categoryStyle: Record<string, string> = {
  HOLIDAY: "bg-emerald-100 text-emerald-800",
  EXAM: "bg-violet-100 text-violet-800",
  EVENT: "bg-blue-100 text-blue-800",
  FEE_DEADLINE: "bg-amber-100 text-amber-800",
  PARENT_MEETING: "bg-pink-100 text-pink-800",
};

export default async function StudentCalendarPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const events = await listVisibleCalendarEvents(schoolSlug);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = events.filter((event) => event.endDate >= today);
  const recent = events.filter((event) => event.endDate < today).reverse().slice(0, 20);

  return (
    <SelfServicePage title="School calendar" description="Dates and events relevant to you and your linked students.">
      {events.length === 0 ? (
        <SelfServiceEmptyState icon={CalendarDays} title="No calendar events" description="Holidays, exams, meetings, and deadlines will appear here." />
      ) : (
        <div className="space-y-8">
          <EventList title="Upcoming" events={upcoming} />
          {recent.length > 0 && <EventList title="Recent" events={recent} />}
        </div>
      )}
    </SelfServicePage>
  );
}

function EventList({ title, events }: { title: string; events: Awaited<ReturnType<typeof listVisibleCalendarEvents>> }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {events.length === 0 && <p className="rounded-2xl border bg-white/80 p-6 text-sm text-muted-foreground">Nothing scheduled.</p>}
      {events.map((event) => (
        <article key={event.id} className="flex gap-4 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
          <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><span className="text-[10px] font-bold uppercase">{event.startDate.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}</span><span className="text-xl font-black">{event.startDate.getUTCDate()}</span></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{event.title}</h3><Badge className={categoryStyle[event.category]}>{event.category.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{formatDate(event.startDate)}{event.endDate.getTime() !== event.startDate.getTime() ? ` – ${formatDate(event.endDate)}` : ""} · {event.targetLabel}</p>{event.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description}</p>}</div>
        </article>
      ))}
    </section>
  );
}
