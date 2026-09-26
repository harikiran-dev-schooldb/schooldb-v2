import { Bell, CheckCheck, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notificationContext } from "@/features/notifications/service";
import { markAnnouncement } from "@/features/notifications/actions";
import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/self-service-format";

export default async function NotificationInbox({ params, searchParams }: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ page?: string; unread?: string }>;
}) {
  const { schoolSlug } = await params;
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  const { membership, where } = await notificationContext(schoolSlug);
  const filtered = { ...where, ...(query.unread === "1" ? { reads: { none: { userId: membership.userId } } } : {}) };
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where: filtered, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 25, skip: (Math.floor(page) - 1) * 25,
      include: { reads: { where: { userId: membership.userId }, select: { id: true } } },
    }),
    prisma.announcement.count({ where: filtered }),
  ]);
  const base = `/${schoolSlug}/my/notifications`;
  return (
    <SelfServicePage title="Notifications" description="School updates for you and your linked students.">
      <section className="relative overflow-hidden rounded-[30px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/80 to-violet-100/70 p-6 text-slate-950 shadow-[0_26px_70px_rgba(79,70,229,0.1)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600"><Sparkles className="size-4" />School updates</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Stay in the loop</h2><p className="mt-2 text-sm text-slate-600">Announcements, reminders, and important school messages.</p></div>
          <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-xl"><span className="font-black text-slate-950">{total}</span> updates</div>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-2">
        <Button asChild size="sm" className="rounded-xl" variant={query.unread === "1" ? "outline" : "default"}><Link href={base}>All updates</Link></Button>
        <Button asChild size="sm" className="rounded-xl" variant={query.unread === "1" ? "default" : "outline"}><Link href={`${base}?unread=1`}>Unread</Link></Button>
        <Button asChild size="sm" className="ml-auto rounded-xl" variant="ghost"><Link href={`/${schoolSlug}/my`}>Back to overview <ChevronRight className="size-4" /></Link></Button>
      </div>
      {items.length === 0 && <SelfServiceEmptyState icon={Bell} title={query.unread === "1" ? "All caught up" : "No notifications yet"} description="New school updates will appear here when published." />}
      {items.map((item) => (
        <article key={item.id} className={`space-y-4 rounded-[24px] border bg-card/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)] sm:p-6 ${item.reads.length ? "border-border/60" : "border-indigo-300 shadow-[0_16px_45px_rgba(79,70,229,0.1)]"}`}>
          <div className="flex flex-wrap gap-2">
            {!item.reads.length && <Badge>New</Badge>}
            <Badge variant="outline">{item.category}</Badge>
            {item.priority !== "NORMAL" && <Badge variant={item.priority === "URGENT" ? "destructive" : "warning"}>{item.priority}</Badge>}
          </div>
          <h2 className="text-lg font-bold">{item.title}</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">{item.body}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{formatDate(item.publishedAt)} · {item.targetLabel}</p>
            <form action={markAnnouncement.bind(null, schoolSlug, item.id, item.reads.length === 0)}>
              <Button size="sm" variant="outline" className="rounded-xl">{item.reads.length ? "Mark unread" : <><CheckCheck className="size-4" />Mark read</>}</Button>
            </form>
          </div>
        </article>
      ))}
      <div className="flex items-center gap-3">
        {page > 1 && <Link href={`${base}?page=${Math.floor(page) - 1}&unread=${query.unread === "1" ? "1" : "0"}`}>Previous</Link>}
        <span className="text-xs text-muted-foreground">{total} updates</span>
        {page * 25 < total && <Link href={`${base}?page=${Math.floor(page) + 1}&unread=${query.unread === "1" ? "1" : "0"}`}>Next</Link>}
      </div>
    </SelfServicePage>
  );
}
