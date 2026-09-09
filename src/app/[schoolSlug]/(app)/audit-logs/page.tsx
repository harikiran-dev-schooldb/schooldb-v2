import Link from "next/link";
import {
  Activity,
  Clock3,
  Filter,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    q?: string;
    actor?: string;
    module?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

function safeDate(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`,
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function badgeVariant(action: string) {
  if (["DELETE", "VOID", "DISABLE"].includes(action))
    return "destructive" as const;
  if (["CREATE", "ENABLE", "COLLECT"].includes(action))
    return "success" as const;
  if (["PUBLISH", "SEND", "IMPORT"].includes(action)) return "info" as const;
  if (["ARCHIVE", "LOCK", "CORRECT"].includes(action))
    return "warning" as const;
  return "outline" as const;
}

function pageHref(
  schoolSlug: string,
  values: Record<string, string | undefined>,
  page: number,
) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  query.set("page", String(page));
  return `/${schoolSlug}/audit-logs?${query.toString()}`;
}

export default async function AuditLogsPage({ params, searchParams }: Props) {
  const [{ schoolSlug }, filters] = await Promise.all([params, searchParams]);
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    schoolSlug,
  );
  const q = filters.q?.trim();
  const actor = filters.actor?.trim();
  const moduleFilter = AUDIT_MODULES.includes(
    filters.module as (typeof AUDIT_MODULES)[number],
  )
    ? filters.module
    : undefined;
  const action = AUDIT_ACTIONS.includes(
    filters.action as (typeof AUDIT_ACTIONS)[number],
  )
    ? filters.action
    : undefined;
  const from = safeDate(filters.from);
  const to = safeDate(filters.to, true);
  const page = Math.max(1, Number.parseInt(filters.page || "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {
    schoolId: membership.schoolId,
    ...(moduleFilter ? { module: moduleFilter } : {}),
    ...(action ? { action } : {}),
    ...(actor ? { actorName: { contains: actor, mode: "insensitive" } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { summary: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [logs, total, totalForSchool, todayCount, activeActors] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          actorName: true,
          actorRole: true,
          module: true,
          action: true,
          entityType: true,
          entityId: true,
          summary: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { schoolId: membership.schoolId } }),
      prisma.auditLog.count({
        where: { schoolId: membership.schoolId, createdAt: { gte: today } },
      }),
      prisma.auditLog.groupBy({
        by: ["actorUserId"],
        where: { schoolId: membership.schoolId, actorUserId: { not: null } },
        _count: { _all: true },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const preserved = {
    q,
    actor,
    module: moduleFilter,
    action,
    from: filters.from,
    to: filters.to,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Activity & Audit Logs"
        description="A protected record of important changes made across this school workspace."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={ShieldCheck}
          label="Recorded activities"
          value={totalForSchool}
        />
        <Stat icon={Clock3} label="Activities today" value={todayCount} />
        <Stat
          icon={UserRoundCheck}
          label="Recorded users"
          value={activeActors.length}
        />
      </section>

      <form className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="size-4 text-indigo-600" />
          <h2 className="font-bold">Filter activity</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            Search
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Record or reference"
                className="pl-9"
              />
            </div>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            User
            <Input
              name="actor"
              defaultValue={actor}
              placeholder="Search user name"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Module
            <select
              name="module"
              defaultValue={moduleFilter || ""}
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">All modules</option>
              {AUDIT_MODULES.map((item) => (
                <option key={item} value={item}>
                  {humanize(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Action
            <select
              name="action"
              defaultValue={action || ""}
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((item) => (
                <option key={item} value={item}>
                  {humanize(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            From date
            <Input name="from" type="date" defaultValue={filters.from} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            To date
            <Input name="to" type="date" defaultValue={filters.to} />
          </label>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="submit" className="flex-1 md:flex-none">
              Apply filters
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href={`/${schoolSlug}/audit-logs`}>Clear</Link>
            </Button>
          </div>
        </div>
      </form>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold">Activity history</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {total} matching record{total === 1 ? "" : "s"}
            </p>
          </div>
          <Badge variant="outline">Newest first</Badge>
        </div>

        {logs.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Activity className="size-6" />
            </div>
            <h3 className="mt-4 font-bold">No activity found</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Important changes will appear here automatically. Try clearing the
              current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <article
                key={log.id}
                className="grid gap-3 p-5 transition-colors hover:bg-muted/30 lg:grid-cols-[11rem_9rem_minmax(0,1fr)_12rem] lg:items-center"
              >
                <div>
                  <Badge variant={badgeVariant(log.action)}>
                    {humanize(log.action)}
                  </Badge>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {humanize(log.module)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{log.actorName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {humanize(log.actorRole)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-6">
                    {log.summary}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {humanize(log.entityType)}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </p>
                </div>
                <time
                  className="text-xs font-medium text-muted-foreground lg:text-right"
                  dateTime={log.createdAt.toISOString()}
                >
                  {dateTime(log.createdAt)}
                </time>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Page {Math.min(page, totalPages)} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                <Link
                  href={pageHref(schoolSlug, preserved, Math.max(1, page - 1))}
                >
                  Previous
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className={
                  page >= totalPages ? "pointer-events-none opacity-50" : ""
                }
              >
                <Link
                  href={pageHref(
                    schoolSlug,
                    preserved,
                    Math.min(totalPages, page + 1),
                  )}
                >
                  Next
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight">
        {value.toLocaleString("en-IN")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
