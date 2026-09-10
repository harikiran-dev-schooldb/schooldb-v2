import { CheckCheck, CheckCircle2, Clock3, Eye, MessageCircleMore, TriangleAlert, Users } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WhatsappCampaignForm } from "@/features/whatsapp/WhatsappCampaignForm";
import { SendCampaignButton } from "@/features/whatsapp/SendCampaignButton";
import { RetryCampaignButton } from "@/features/whatsapp/RetryCampaignButton";

const statusVariant = { QUEUED: "warning", SENDING: "info", COMPLETED: "success", PARTIAL: "warning", FAILED: "destructive", CANCELLED: "outline" } as const;

export default async function WhatsappPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const [academicYear, campaigns] = await Promise.all([
    prisma.academicYear.findFirst({ where: { schoolId: membership.schoolId, active: true }, orderBy: { startDate: "desc" }, select: { id: true } }),
    prisma.whatsappCampaign.findMany({
      where: { schoolId: membership.schoolId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        recipients: {
          where: { status: "FAILED" },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: {
            id: true,
            recipientName: true,
            phone: true,
            attempts: true,
            errorMessage: true,
          },
        },
      },
    }),
  ]);
  const configured = Boolean(process.env.META_PHONE_NUMBER_ID && process.env.META_WA_TOKEN && process.env.META_WA_ANNOUNCEMENT_TEMPLATE);
  const deliveryTrackingConfigured = Boolean(process.env.META_APP_SECRET && process.env.META_WA_WEBHOOK_VERIFY_TOKEN);

  return <PageContainer>
    <PageHeader title="WhatsApp communication" description="Prepare targeted family alerts and track every delivery from one secure workspace." />
    {!configured && <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><TriangleAlert className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-bold">Announcement template needs configuration</p><p className="mt-1 text-xs leading-5">Add the approved Meta template name as META_WA_ANNOUNCEMENT_TEMPLATE before starting delivery. Campaigns can still be prepared safely.</p></div></div>}
    {!deliveryTrackingConfigured && <div className="mb-5 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950"><Clock3 className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-bold">Delivery tracking is ready to connect</p><p className="mt-1 text-xs leading-5">Add the Meta App Secret and connect the deployed webhook callback to start receiving delivered, read and failure updates.</p></div></div>}
    <WhatsappCampaignForm schoolSlug={schoolSlug} academicYearId={academicYear?.id ?? null} />
    <section className="mt-8 space-y-4"><div><h2 className="text-lg font-bold">Campaign history</h2><p className="text-sm text-muted-foreground">Latest 50 campaigns with recipient-level delivery totals.</p></div>
      {campaigns.length === 0 ? <Card><CardContent className="flex min-h-48 flex-col items-center justify-center text-center"><MessageCircleMore className="size-8 text-muted-foreground" /><p className="mt-3 font-semibold">No WhatsApp campaigns yet</p><p className="mt-1 text-sm text-muted-foreground">Create the first targeted message above.</p></CardContent></Card> : campaigns.map((campaign) => {
        const canSend = ["QUEUED", "SENDING", "PARTIAL", "FAILED"].includes(campaign.status) && campaign.scheduledAt <= new Date();
        return <article key={campaign.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant[campaign.status]}>{campaign.status}</Badge>{campaign.automatic && <Badge variant="info">Automatic</Badge>}<Badge variant="outline">{campaign.targetLabel}</Badge></div><h3 className="mt-3 font-bold">{campaign.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{campaign.message}</p></div><div className="flex flex-wrap gap-2">{campaign.failedCount > 0 && configured && <RetryCampaignButton schoolSlug={schoolSlug} campaignId={campaign.id} failedCount={campaign.failedCount} />}{canSend && configured && <SendCampaignButton schoolSlug={schoolSlug} campaignId={campaign.id} />}</div></div>
          <div className="mt-4 grid gap-3 border-t pt-4 text-xs sm:grid-cols-3 xl:grid-cols-6"><span className="flex items-center gap-2 text-muted-foreground"><Users className="size-3.5" />{campaign.recipientCount} recipients</span><span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="size-3.5" />{campaign.sentCount} sent</span><span className="flex items-center gap-2 text-blue-700"><CheckCheck className="size-3.5" />{campaign.deliveredCount} delivered</span><span className="flex items-center gap-2 text-violet-700"><Eye className="size-3.5" />{campaign.readCount} read</span><span className="flex items-center gap-2 text-destructive"><TriangleAlert className="size-3.5" />{campaign.failedCount} failed</span><span className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-3.5" />{campaign.scheduledAt > new Date() ? "Scheduled " : "Created "}{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(campaign.scheduledAt)}</span></div>
          {campaign.recipients.length > 0 && <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wider text-red-800">Recent delivery failures</p><div className="mt-3 space-y-2">{campaign.recipients.map((recipient) => <div key={recipient.id} className="grid gap-1 text-xs text-red-950 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><span className="font-semibold">{recipient.recipientName} · ••••{recipient.phone.slice(-4)} · {recipient.attempts} attempt{recipient.attempts === 1 ? "" : "s"}</span><span className="text-red-800">{recipient.errorMessage || "The provider did not return a reason."}</span></div>)}</div>{campaign.failedCount > campaign.recipients.length && <p className="mt-2 text-[11px] text-red-700">Showing the latest {campaign.recipients.length} of {campaign.failedCount} failures.</p>}</div>}
        </article>;
      })}
    </section>
  </PageContainer>;
}
