import Link from "next/link";
import { isRouteAllowed } from "@/lib/route-access";
import { Bell, CheckCheck, Inbox, MailOpen } from "lucide-react";

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
  const [items, totalCount, unreadCount] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        ...where,
        ...(query.announcementId ? { id: query.announcementId } : {}),
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

  return (
    <PageContainer>
      <PageHeader
        title="Notification inbox"
        description="School announcements and updates relevant to your role."
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
          {items.map((item) => {
            const read = item.reads.length > 0;
            return (
              <article
                key={item.id}
                id={`announcement-${item.id}`}
                className={`scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm ${
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
                    {formatDate(item.publishedAt)}
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
          })}
        </div>
      )}
    </PageContainer>
  );
}
