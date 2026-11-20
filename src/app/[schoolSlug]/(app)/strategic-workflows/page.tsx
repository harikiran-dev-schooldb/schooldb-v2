import Link from "next/link";
import { AlertTriangle, Clock3, LockKeyhole, Search, SlidersHorizontal, Workflow, X } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EarlyWarningScanButton } from "@/features/strategic-workflows/EarlyWarningScanButton";
import { canCreateStrategicWorkflow, canUpdateStrategicWorkflow } from "@/features/strategic-workflows/access";
import { StrategicWorkflowForm } from "@/features/strategic-workflows/StrategicWorkflowForm";
import { StrategicWorkflowUpdateForm } from "@/features/strategic-workflows/StrategicWorkflowUpdateForm";
import { WORKFLOW_STATUSES, WORKFLOW_TYPES, workflowLabel } from "@/features/strategic-workflows/constants";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"];

function dateTime(value: Date | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(value);
}

function statusVariant(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELLED") return "outline" as const;
  if (status === "WAITING") return "warning" as const;
  return "info" as const;
}

function priorityVariant(priority: string) {
  if (priority === "CRITICAL") return "destructive" as const;
  if (priority === "HIGH") return "warning" as const;
  return "outline" as const;
}

export default async function StrategicWorkflowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ q?: string | string[]; type?: string | string[]; status?: string | string[] }>;
}) {
  const { schoolSlug } = await params;
  const filters = await searchParams;
  const query = (Array.isArray(filters.q) ? filters.q[0] : filters.q)?.trim().slice(0, 100) ?? "";
  const requestedType = Array.isArray(filters.type) ? filters.type[0] : filters.type;
  const requestedStatus = Array.isArray(filters.status) ? filters.status[0] : filters.status;
  const selectedType = WORKFLOW_TYPES.some(({ value }) => value === requestedType) ? requestedType : "";
  const selectedStatus = WORKFLOW_STATUSES.includes(requestedStatus as (typeof WORKFLOW_STATUSES)[number]) ? requestedStatus : "";
  const membership = await requireRole(roles, schoolSlug);
  const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role);
  const canCreate = canCreateStrategicWorkflow(membership);
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: membership.schoolId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true },
  });
  const visibility = isAdmin
    ? {}
    : { OR: [{ confidential: false }, { ownerUserId: membership.userId }, { createdByUserId: membership.userId }] };

  const [allWorkflows, staff, students, teachers] = await Promise.all([
    prisma.strategicWorkflow.findMany({
      where: { schoolId: membership.schoolId, ...visibility },
      include: {
        owner: { select: { firstName: true, lastName: true, email: true } },
        teacher: { select: { fullName: true } },
        studentEnrollment: {
          select: {
            student: { select: { fullName: true, admissionNo: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { actor: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: 300,
    }),
    prisma.membership.findMany({
      where: { schoolId: membership.schoolId, isActive: true, role: { in: roles as never[] } },
      select: { userId: true, role: true, user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { role: "asc" },
    }),
    activeYear
      ? prisma.studentEnrollment.findMany({
          where: { schoolId: membership.schoolId, academicYearId: activeYear.id, active: true, student: { status: "ACTIVE" } },
          select: { id: true, rollNo: true, student: { select: { fullName: true, admissionNo: true } }, class: { select: { name: true } }, section: { select: { name: true } } },
          orderBy: [{ class: { displayOrder: "asc" } }, { section: { displayOrder: "asc" } }, { rollNo: "asc" }],
          take: 2000,
        })
      : Promise.resolve([]),
    prisma.teacher.findMany({
      where: { schoolId: membership.schoolId, active: true },
      select: { id: true, employeeId: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const normalizedQuery = query.toLowerCase();
  const workflows = allWorkflows.filter((workflow) => {
    if (selectedType && workflow.type !== selectedType) return false;
    if (selectedStatus && workflow.status !== selectedStatus) return false;
    if (!normalizedQuery) return true;
    const searchable = [
      workflow.title,
      workflow.description,
      workflow.studentEnrollment?.student.fullName,
      workflow.studentEnrollment?.student.admissionNo,
      workflow.teacher?.fullName,
      workflow.owner?.firstName,
      workflow.owner?.lastName,
      workflow.owner?.email,
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(normalizedQuery);
  });
  const openCount = allWorkflows.filter(({ status }) => !["COMPLETED", "CANCELLED"].includes(status)).length;
  const overdueCount = allWorkflows.filter(({ status, dueAt }) => dueAt && dueAt < new Date() && !["COMPLETED", "CANCELLED"].includes(status)).length;
  const criticalCount = allWorkflows.filter(({ priority, status }) => priority === "CRITICAL" && !["COMPLETED", "CANCELLED"].includes(status)).length;
  const typeCounts = new Map(WORKFLOW_TYPES.map(({ value }) => [value, allWorkflows.filter(({ type }) => type === value).length]));
  const filtering = Boolean(query || selectedType || selectedStatus);

  return (
    <PageContainer>
      <PageHeader
        title="Strategic workflows"
        description="Run learning, family engagement, wellbeing, transport, procurement, substitutions and early intervention from one accountable workspace."
        actions={isAdmin ? <EarlyWarningScanButton schoolSlug={schoolSlug} /> : undefined}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 pt-5"><span className="rounded-2xl bg-indigo-50 p-3 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-300"><Workflow className="size-5" /></span><div><p className="text-2xl font-black">{openCount}</p><p className="text-sm text-muted-foreground">Open workflows</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 pt-5"><span className="rounded-2xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300"><Clock3 className="size-5" /></span><div><p className="text-2xl font-black">{overdueCount}</p><p className="text-sm text-muted-foreground">Overdue</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 pt-5"><span className="rounded-2xl bg-rose-50 p-3 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300"><AlertTriangle className="size-5" /></span><div><p className="text-2xl font-black">{criticalCount}</p><p className="text-sm text-muted-foreground">Critical</p></div></CardContent></Card>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {WORKFLOW_TYPES.map((item) => (
          <Link
            key={item.value}
            href={`/${schoolSlug}/strategic-workflows?type=${item.value}`}
            className={selectedType === item.value
              ? "rounded-2xl border border-indigo-300 bg-indigo-50/80 p-4 shadow-sm ring-2 ring-indigo-500/10 transition dark:border-indigo-500/35 dark:bg-indigo-500/10"
              : "rounded-2xl border border-border/70 bg-card p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:hover:border-indigo-500/30"}
          >
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{item.label}</h2><Badge variant="outline">{typeCounts.get(item.value) ?? 0}</Badge></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </section>

      {canCreate && <StrategicWorkflowForm
        schoolSlug={schoolSlug}
        staff={staff.map(({ userId, role, user }) => ({ value: userId, label: `${[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email} · ${workflowLabel(role)}` }))}
        students={students.map(({ id, rollNo, student, class: classRecord, section }) => ({ value: id, label: `${student.fullName || student.admissionNo} · ${classRecord.name}-${section.name}${rollNo ? ` · Roll ${rollNo}` : ""}` }))}
        teachers={teachers.map(({ id, employeeId, fullName }) => ({ value: id, label: `${fullName} · ${employeeId}` }))}
      />}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-black">Workflow board</h2><p className="text-sm text-muted-foreground">{filtering ? `${workflows.length} of ${allWorkflows.length} records match these filters.` : "Latest 300 records, ordered by active status, priority and deadline."}</p></div>{filtering && <Button asChild variant="ghost" size="sm"><Link href={`/${schoolSlug}/strategic-workflows`}><X className="size-4" />Clear filters</Link></Button>}</div>
        <form className="grid gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm sm:grid-cols-[minmax(220px,1fr)_220px_180px_auto]" method="get">
          <label className="relative"><span className="sr-only">Search workflows</span><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input name="q" defaultValue={query} placeholder="Search title, student, teacher or owner…" className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10" /></label>
          <label><span className="sr-only">Workflow area</span><select name="type" defaultValue={selectedType} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">All workflow areas</option>{WORKFLOW_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="sr-only">Workflow status</span><select name="status" defaultValue={selectedStatus} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">All statuses</option>{WORKFLOW_STATUSES.map((status) => <option key={status} value={status}>{workflowLabel(status)}</option>)}</select></label>
          <Button type="submit" variant="outline"><SlidersHorizontal className="size-4" />Filter</Button>
        </form>
        {workflows.length === 0 && <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">{filtering ? "No workflows match these filters." : "No workflows yet. Create one above or run the academic-risk scan."}</div>}
        {workflows.map((workflow) => {
          const student = workflow.studentEnrollment;
          const ownerName = workflow.owner ? [workflow.owner.firstName, workflow.owner.lastName].filter(Boolean).join(" ") || workflow.owner.email : "Unassigned";
          return (
            <Card key={workflow.id} className={workflow.priority === "CRITICAL" ? "border-rose-200 dark:border-rose-500/30" : undefined}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{workflowLabel(workflow.type)}</Badge>
                  <Badge variant={statusVariant(workflow.status)}>{workflowLabel(workflow.status)}</Badge>
                  <Badge variant={priorityVariant(workflow.priority)}>{workflowLabel(workflow.priority)}</Badge>
                  {workflow.confidential && <Badge variant="outline"><LockKeyhole className="size-3" />Confidential</Badge>}
                </div>
                <CardTitle className="mt-2 text-lg">{workflow.title}</CardTitle>
                <CardDescription>{workflow.description || "No description provided."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 rounded-2xl bg-muted/40 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</dt><dd className="mt-1 font-medium">{ownerName}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</dt><dd className="mt-1 font-medium">{student ? `${student.student.fullName || student.student.admissionNo} · ${student.class.name}-${student.section.name}` : "Not linked"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher</dt><dd className="mt-1 font-medium">{workflow.teacher?.fullName || "Not linked"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due</dt><dd className="mt-1 font-medium">{dateTime(workflow.dueAt)}</dd></div>
                </dl>
                {workflow.events.length > 0 && <div className="space-y-2"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent history</h3>{workflow.events.map((event) => <div key={event.id} className="flex flex-col gap-1 rounded-xl border border-border/60 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"><span>{event.message || workflowLabel(event.type)}</span><span className="text-muted-foreground">{dateTime(event.createdAt)}</span></div>)}</div>}
                {canUpdateStrategicWorkflow(membership, workflow) && <StrategicWorkflowUpdateForm schoolSlug={schoolSlug} workflowId={workflow.id} status={workflow.status} />}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </PageContainer>
  );
}
