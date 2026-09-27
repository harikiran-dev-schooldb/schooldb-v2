import { Bell, CheckCheck } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markAnnouncement } from "@/features/notifications/actions";
import { notificationContext } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/self-service-format";

export default async function NotificationInboxPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const { membership, where } = await notificationContext(schoolSlug);
  const items = await prisma.announcement.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 100,
    include: {
      reads: {
        where: { userId: membership.userId },
        select: { id: true },
      },
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Notification inbox"
        description="School announcements and updates relevant to your role."
      />
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-12 text-center">
          <Bell className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">No notifications yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New school updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const read = item.reads.length > 0;
            return (
              <article
                key={item.id}
                className={`rounded-3xl border bg-card p-5 shadow-sm ${
                  read ? "border-border/70" : "border-primary/30 ring-1 ring-primary/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {!read && <Badge>New</Badge>}
                    <Badge variant="outline">{item.category}</Badge>
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
