import Link from "next/link";
import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  Cloud,
  Download,
  HardDrive,
  MessageCircleMore,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateStorageStatus } from "@/lib/private-storage";

type CheckStatus = "ready" | "attention";

type ReadinessCheck = {
  name: string;
  detail: string;
  status: CheckStatus;
};

export const dynamic = "force-dynamic";

export default async function SystemHealthPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const [academicYear, staffCount, studentCount, messageCounts, documentCounts] =
    await Promise.all([
      prisma.academicYear.findFirst({
        where: { schoolId: membership.schoolId, active: true },
        orderBy: { startDate: "desc" },
        select: { name: true },
      }),
      prisma.membership.count({
        where: { schoolId: membership.schoolId, isActive: true },
      }),
      prisma.student.count({
        where: { schoolId: membership.schoolId, status: "ACTIVE" },
      }),
      prisma.whatsappRecipient.groupBy({
        by: ["status"],
        where: {
          schoolId: membership.schoolId,
          status: { in: ["QUEUED", "FAILED"] },
        },
        _count: { _all: true },
      }),
      Promise.all([
        prisma.studentDocument.count({
          where: { schoolId: membership.schoolId },
        }),
        prisma.admissionDocument.count({
          where: { schoolId: membership.schoolId },
        }),
      ]),
    ]);
  const queuedMessages =
    messageCounts.find((item) => item.status === "QUEUED")?._count._all ?? 0;
  const failedMessages =
    messageCounts.find((item) => item.status === "FAILED")?._count._all ?? 0;
  const storage = getPrivateStorageStatus();
  const whatsappConfigured = Boolean(
    process.env.META_PHONE_NUMBER_ID &&
      process.env.META_WA_TOKEN &&
      process.env.META_WA_ANNOUNCEMENT_TEMPLATE,
  );
  const trackingConfigured = Boolean(
    process.env.META_APP_SECRET && process.env.META_WA_WEBHOOK_VERIFY_TOKEN,
  );
  const authProductionReady = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_") &&
      process.env.CLERK_SECRET_KEY?.startsWith("sk_live_"),
  );
  const backupsConfirmed =
    process.env.SCHOOLDB_DATABASE_BACKUPS_CONFIRMED === "true";

  const checks: ReadinessCheck[] = [
    {
      name: "Database",
      detail: "Connected and responding",
      status: "ready",
    },
    {
      name: "Authentication",
      detail: authProductionReady
        ? "Clerk production keys are configured"
        : "Development keys are active; add Clerk production keys before launch",
      status: authProductionReady ? "ready" : "attention",
    },
    {
      name: "Private documents",
      detail: storage.blobConfigured
        ? "Private Vercel Blob storage is active"
        : "Local disk is active; connect Blob before production",
      status: storage.blobConfigured ? "ready" : "attention",
    },
    {
      name: "WhatsApp sending",
      detail: whatsappConfigured
        ? "Cloud API and announcement template are configured"
        : "Complete the Meta Cloud API settings",
      status: whatsappConfigured ? "ready" : "attention",
    },
    {
      name: "Delivery tracking",
      detail: trackingConfigured
        ? "Signed webhook delivery updates are enabled"
        : "Add webhook secret and verification token",
      status: trackingConfigured ? "ready" : "attention",
    },
    {
      name: "Automatic alerts",
      detail:
        process.env.META_WA_AUTOMATION_ENABLED === "true"
          ? "Attendance, homework, result and fee alerts are enabled"
          : "Automation is currently disabled",
      status:
        process.env.META_WA_AUTOMATION_ENABLED === "true"
          ? "ready"
          : "attention",
    },
    {
      name: "Database backups",
      detail: backupsConfirmed
        ? "Daily provider-managed backups confirmed"
        : "Enable daily backups with the PostgreSQL provider, then confirm",
      status: backupsConfirmed ? "ready" : "attention",
    },
    {
      name: "Scheduled job security",
      detail: process.env.CRON_SECRET
        ? "Scheduled jobs are protected"
        : "Add CRON_SECRET before deployment",
      status: process.env.CRON_SECRET ? "ready" : "attention",
    },
  ];
  const readyCount = checks.filter((check) => check.status === "ready").length;

  return (
    <PageContainer>
      <PageHeader
        title="System Health"
        description="A single view of deployment safety, data protection, storage and communication readiness."
        actions={
          <Button asChild variant="outline">
            <Link href="/api/v1/system/export">
              <Download className="size-4" /> Download data snapshot
            </Link>
          </Button>
        }
      />

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              Production readiness
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              {readyCount} of {checks.length} safeguards ready
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Resolve every amber item before opening SchoolDB to the full school.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <p className="text-xs text-slate-300">Current academic year</p>
            <p className="mt-1 text-lg font-bold">{academicYear?.name || "Not set"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Active students" value={studentCount} />
        <MetricCard icon={ShieldCheck} label="Active staff access" value={staffCount} />
        <MetricCard icon={HardDrive} label="Private documents" value={documentCounts[0] + documentCounts[1]} />
        <MetricCard
          icon={MessageCircleMore}
          label="Messages needing attention"
          value={queuedMessages + failedMessages}
          note={`${queuedMessages} queued · ${failedMessages} failed`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Launch checklist</CardTitle>
          <CardDescription>
            Configuration values are checked without displaying any secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex items-start gap-3 rounded-2xl border bg-muted/20 p-4"
            >
              {check.status === "ready" ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">{check.name}</p>
                  <Badge variant={check.status === "ready" ? "success" : "warning"}>
                    {check.status === "ready" ? "READY" : "ACTION NEEDED"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {check.detail}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="size-5 text-primary" /> Document storage
            </CardTitle>
            <CardDescription>
              Uploads remain private and are served only after SchoolDB permission checks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{storage.provider}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Existing local documents remain supported. New production uploads use private cloud storage automatically after the store is connected.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArchiveRestore className="size-5 text-primary" /> Data protection
            </CardTitle>
            <CardDescription>
              The snapshot is useful for school records; provider backups remain the disaster-recovery copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Daily backup:</strong> enable and retain it with the PostgreSQL host.</p>
            <p><strong className="text-foreground">School snapshot:</strong> download a fresh copy after major imports or year-end changes.</p>
            <p><strong className="text-foreground">Restore:</strong> intentionally restricted to a supervised operation to prevent accidental overwrites.</p>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString("en-IN")}</p>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
