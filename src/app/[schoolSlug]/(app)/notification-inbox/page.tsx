import Link from "next/link";
import { isRouteAllowed } from "@/lib/route-access";
import { Bell, CheckCheck, Inbox, MailOpen, MessageCircle, ChevronDown } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markAnnouncement } from "@/features/notifications/actions";
import { notificationContext } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/self-service-format";

export default async function NotificationInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ announcementId?: string; filter?: string }>;
}) {
  const [{ schoolSlug }, query] = await Promise.all([params, searchParams]);
  const { membership, where } = await notificationContext(schoolSlug);
  const unreadOnly = query.filter === "unread" && !query.announcementId;
  const unreadWhere = { reads: { none: { userId: membership.userId } } };
  const selected = query.announcementId ? await prisma.announcement.findFirst({
    where: { ...where, id: query.announcementId },
    select: { sourceType: true, sourceId: true },
  }) : null;
  const selectedTicket = selected?.sourceType === "SUPPORT_TICKET" ? selected.sourceId : null;
  const [items, totalCount, unreadCount] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        ...where,
        ...(query.announcementId ? (selectedTicket ? { sourceType: "SUPPORT_TICKET", sourceId: selectedTicket } : { id: query.announcementId }) : {}),
        ...(unreadOnly ? unreadWhere : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 100,
      include: {
        reads: {
          where: { userId: membership.userId },
          select: { id: true },
        },
      },
    }),
    prisma.announcement.count({ where }),
    prisma.announcement.count({ where: { ...where, ...unreadWhere } }),
  ]);

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.sourceType === "SUPPORT_TICKET" && item.sourceId
      ? `ticket:${item.sourceId}` : `announcement:${item.id}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  const ticketIds = [...groups.keys()].filter(key => key.startsWith("ticket:")).map(key => key.slice(7));
  const tickets = ticketIds.length ? await prisma.supportTicket.findMany({
    where: { schoolId: membership.schoolId, id: { in: ticketIds } },
    select: { id: true, ticketNo: true, subject: true },
  }) : [];
  const ticketById = new Map(tickets.map(ticket => [ticket.id, ticket]));

  return (
    <PageContainer>
      <PageHeader
        title="Notification inbox"
        description="School updates and support ticket conversations relevant to your role."
      />
      {!query.announcementId && (
        <section className="premium-card flex flex-col gap-4 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Inbox className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Your notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread · {totalCount} total
              </p>
            </div>
          </div>
          <div className="flex rounded-xl border border-border/70 bg-muted/25 p-1" role="group" aria-label="Filter notifications">
            <Button asChild size="sm" variant={unreadOnly ? "ghost" : "default"} className="flex-1 rounded-lg sm:flex-none">
              <Link href={`/${schoolSlug}/notification-inbox`} aria-current={!unreadOnly ? "page" : undefined}>All <Badge variant="outline" className="ml-1.5 bg-background/70">{totalCount}</Badge></Link>
            </Button>
            <Button asChild size="sm" variant={unreadOnly ? "default" : "ghost"} className="flex-1 rounded-lg sm:flex-none">
              <Link href={`/${schoolSlug}/notification-inbox?filter=unread`} aria-current={unreadOnly ? "page" : undefined}>Unread <Badge variant="outline" className="ml-1.5 bg-background/70">{unreadCount}</Badge></Link>
            </Button>
          </div>
        </section>
      )}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-12 text-center">
          {unreadOnly ? <MailOpen className="mx-auto size-8 text-muted-foreground" /> : <Bell className="mx-auto size-8 text-muted-foreground" />}
          <h2 className="mt-4 font-semibold">{unreadOnly ? "You’re all caught up" : "No notifications yet"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadOnly ? "There are no unread notifications." : "New school updates will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...groups.entries()].map(([key, entries]) => {
            const ticketThread = key.startsWith("ticket:");
            const latest = entries[0];
            const ticket = ticketThread ? ticketById.get(key.slice(7)) : undefined;
            const unread = entries.filter(entry => entry.reads.length === 0).length;
            const cards = (ticketThread ? [...entries].reverse() : entries).map((item) => {
            const read = item.reads.length > 0;
            return (
              <article
                key={item.id}
                id={`announcement-${item.id}`}
                className={`scroll-mt-24 border bg-card p-5 shadow-sm ${ticketThread ? "max-w-[92%] rounded-2xl rounded-tl-sm" : "rounded-3xl"} ${
                  query.announcementId === item.id ? "border-primary ring-4 ring-primary/15" : read ? "border-border/70" : "border-primary/30 ring-1 ring-primary/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {!read && <Badge>New</Badge>}
                    <Badge variant="outline">{item.sourceType==="ADMISSION_EVENT"||item.sourceType==="ADMISSION_REMINDER"?"Admissions":item.category}</Badge>
                    {item.priority !== "NORMAL" && (
                      <Badge
                        variant={item.priority === "URGENT" ? "destructive" : "warning"}
                      >
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {ticketThread ? new Intl.DateTimeFormat("en-IN", {dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(item.publishedAt) : formatDate(item.publishedAt)}
                  </span>
                </div>
                <h2 className="mt-4 text-base font-bold">{item.title}</h2>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {item.body}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {item.targetLabel}
                  </span>
                  {(item.sourceType==="ADMISSION_EVENT"||item.sourceType==="ADMISSION_REMINDER")&&["SUPER_ADMIN","SCHOOL_ADMIN"].includes(membership.role)&&isRouteAllowed(membership.school,"admissions")&&<Button asChild size="sm" variant="outline"><Link href={`/${schoolSlug}/admissions/dashboard`}>Open Admissions</Link></Button>}
                  <form action={markAnnouncement.bind(null, schoolSlug, item.id, !read)}>
                    <Button size="sm" variant="outline" className="rounded-xl">
                      <CheckCheck className="size-4" />
                      {read ? "Mark unread" : "Mark read"}
                    </Button>
                  </form>
                </div>
              </article>
            );
            });
            if (!ticketThread) return <div key={key}>{cards}</div>;
            return (
              <details key={key} open={Boolean(query.announcementId)} className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><MessageCircle className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{ticket ? `${ticket.ticketNo} · ${ticket.subject}` : latest.title}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{latest.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{entries.length} {entries.length === 1 ? "update" : "updates"} · {formatDate(latest.publishedAt)}</span>
                  </span>
                  {unread > 0 && <Badge>{unread} unread</Badge>}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-border/60 bg-muted/30 p-3 sm:p-5">
                  {unreadOnly && <Link className="block text-xs font-semibold text-primary underline" href={`/${schoolSlug}/notification-inbox?announcementId=${encodeURIComponent(latest.id)}`}>View full conversation</Link>}
                  {cards}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
