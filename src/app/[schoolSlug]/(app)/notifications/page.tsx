import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { AnnouncementForm } from "@/features/notifications/AnnouncementForm";
import { PublicationStatusControl } from "@/features/audiences/PublicationStatusControl";
import { setAnnouncementArchived } from "@/features/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/self-service-format";

export default async function NotificationsPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const [academicYear, announcements] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId: membership.schoolId, active: true },
      select: { id: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.announcement.findMany({ where: { schoolId: membership.schoolId }, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { reads: true } } } }),
  ]);
  const now = new Date();
  return (
    <PageContainer>
      <PageHeader title="Notifications & announcements" description="Keep students and families informed with targeted school updates." />
      <AnnouncementForm
        schoolSlug={schoolSlug}
        academicYearId={academicYear?.id ?? null}
      />
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">Recent announcements <span className="text-sm font-normal text-muted-foreground">(latest 100)</span></h2>
        {announcements.length === 0 && <p className="rounded-2xl border p-8 text-center text-muted-foreground">No announcements yet. Create your first notice above.</p>}
        {announcements.map((item) => (
          <article key={item.id} className="space-y-3 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.priority === "URGENT" ? "destructive" : "secondary"}>{item.priority}</Badge>
              <Badge variant="outline">{item.category}</Badge>
              <Badge variant="outline">{item.archived ? "Archived" : item.expiresAt && item.expiresAt <= now ? "Expired" : item.publishedAt > now ? "Scheduled" : "Published"}</Badge>
            </div>
            <h3 className="font-bold">{item.title}</h3>
            <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>
            <p className="text-xs text-muted-foreground">{item.targetLabel} · Publishes {formatDate(item.publishedAt)} · {item._count.reads} accounts read{item.expiresAt ? ` · Expires ${formatDate(item.expiresAt)}` : ""}</p>
            <PublicationStatusControl
              title={item.title}
              archived={item.archived}
              action={setAnnouncementArchived.bind(null, schoolSlug, item.id)}
            />
          </article>
        ))}
      </div>
    </PageContainer>
  );
}
