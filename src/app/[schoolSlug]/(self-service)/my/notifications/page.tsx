import { Bell } from "lucide-react";
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
      <div className="flex gap-2">
        <Button asChild variant={query.unread === "1" ? "outline" : "default"}><Link href={base}>All updates</Link></Button>
        <Button asChild variant={query.unread === "1" ? "default" : "outline"}><Link href={`${base}?unread=1`}>Unread</Link></Button>
        <Button asChild variant="ghost"><Link href={`/${schoolSlug}/my`}>Back to overview</Link></Button>
      </div>
      {items.length === 0 && <SelfServiceEmptyState icon={Bell} title={query.unread === "1" ? "All caught up" : "No notifications yet"} description="New school updates will appear here when published." />}
      {items.map((item) => (
        <article key={item.id} className={`space-y-3 rounded-2xl border bg-card p-6 shadow-sm ${item.reads.length ? "" : "border-indigo-300"}`}>
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
              <Button size="sm" variant="outline">{item.reads.length ? "Mark unread" : "Mark read"}</Button>
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
