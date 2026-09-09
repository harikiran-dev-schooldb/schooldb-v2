import {
  ArrowUpRight,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  Printer,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdmissionReviewActions } from "@/features/admissions/AdmissionReviewActions";
import { AdmissionNumberSettings } from "@/features/admissions/AdmissionNumberSettings";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "WAITLISTED",
  "REJECTED",
  "CONVERTED",
] as const;
type AdmissionStatus = (typeof statuses)[number];

export default async function AdmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    classId?: string;
    page?: string;
  }>;
}) {
  const { schoolSlug } = await params;
  const query = await searchParams;
  const actor = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"],
    schoolSlug,
  );
  const status = statuses.includes(query.status as AdmissionStatus)
    ? (query.status as AdmissionStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const pageSize = 20;
  const where = {
    schoolId: actor.schoolId,
    ...(status ? { status } : {}),
    ...(query.classId ? { applyingClassId: query.classId } : {}),
    ...(query.search
      ? {
          OR: [
            {
              applicationNo: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              studentName: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            { fatherPhone: { contains: query.search } },
            { motherPhone: { contains: query.search } },
            { guardianPhone: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [applications, total, classes, statusCounts, admissionSetting] =
    await Promise.all([
      prisma.admissionApplication.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          academicYear: { select: { name: true } },
          applyingClass: {
            select: {
              name: true,
              sections: {
                where: { active: true },
                orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
                select: { id: true, name: true },
              },
            },
          },
          preferredSection: { select: { name: true } },
          history: { orderBy: { createdAt: "desc" }, take: 3 },
          documents: {
            orderBy: { createdAt: "desc" },
            select: { id: true, type: true, originalName: true },
          },
        },
      }),
      prisma.admissionApplication.count({ where }),
      prisma.class.findMany({
        where: { schoolId: actor.schoolId, active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      prisma.admissionApplication.groupBy({
        by: ["status"],
        where: { schoolId: actor.schoolId },
        _count: { _all: true },
      }),
      prisma.schoolAdmissionSetting.upsert({
        where: { schoolId: actor.schoolId },
        create: { schoolId: actor.schoolId },
        update: {},
      }),
    ]);
  const counts = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  );
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageContainer>
      <PageHeader
        title="Online Admissions"
        description="Review applications, record decisions, and convert approved applicants into enrolled students."
        actions={
          <Button asChild>
            <Link href={`/${schoolSlug}/apply`} target="_blank">
              Open public form <ArrowUpRight />
            </Link>
          </Button>
        }
      />
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl md:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-indigo-200 uppercase">
              Admissions command centre
            </p>
            <h2 className="mt-2 text-2xl font-black">
              From application to enrollment
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">
              Every decision has a history. Approved records become students
              without retyping family or contact details.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <ShieldCheck className="size-7 text-emerald-300" />
            <div>
              <p className="text-xs text-indigo-200">Secure intake</p>
              <p className="font-bold">Duplicate checks enabled</p>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={ClipboardList}
          label="Total applications"
          value={Object.values(counts).reduce((sum, value) => sum + value, 0)}
          tone="indigo"
        />
        <Stat
          icon={Clock3}
          label="Awaiting review"
          value={(counts.SUBMITTED || 0) + (counts.UNDER_REVIEW || 0)}
          tone="amber"
        />
        <Stat
          icon={UserCheck}
          label="Approved"
          value={counts.APPROVED || 0}
          tone="emerald"
        />
        <Stat
          icon={GraduationCap}
          label="Converted"
          value={counts.CONVERTED || 0}
          tone="violet"
        />
      </section>
      {["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(actor.role) && (
        <AdmissionNumberSettings
          initial={{
            automaticNumbering: admissionSetting.automaticNumbering,
            admissionPrefix: admissionSetting.admissionPrefix,
            nextNumber: admissionSetting.nextNumber,
            numberPadding: admissionSetting.numberPadding,
          }}
        />
      )}
      <form className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={query.search}
            placeholder="Search name, number or mobile"
            className="pl-9"
          />
        </div>
        <select
          name="status"
          defaultValue={query.status || ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {label(item)}
            </option>
          ))}
        </select>
        <select
          name="classId"
          defaultValue={query.classId || ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All classes</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Button type="submit">Apply filters</Button>
      </form>
      <section className="space-y-4">
        {applications.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-card p-12 text-center">
            <ClipboardList className="mx-auto size-9 text-muted-foreground" />
            <h2 className="mt-4 font-bold">No applications found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share the public admission form or change the current filters.
            </p>
          </div>
        )}
        {applications.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-3xl border bg-card shadow-sm"
          >
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-700">
                {item.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black">{item.studentName}</h2>
                  <Badge variant={badgeVariant(item.status)}>
                    {label(item.status)}
                  </Badge>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                  >
                    <Link
                      href={`/${schoolSlug}/admissions/${item.id}/print`}
                      target="_blank"
                    >
                      <Printer className="size-3.5" />
                      Print / PDF
                    </Link>
                  </Button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.applicationNo} · {item.academicYear.name} · Applying for{" "}
                  {item.applyingClass.name}
                  {item.preferredSection
                    ? ` / ${item.preferredSection.name}`
                    : ""}
                </p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info
                    label="Date of birth"
                    value={item.dob.toLocaleDateString("en-IN")}
                  />
                  <Info
                    label="Parent / guardian"
                    value={
                      item.fatherName ||
                      item.motherName ||
                      item.guardianName ||
                      "Not provided"
                    }
                  />
                  <Info
                    label="Contact"
                    value={
                      item.fatherPhone ||
                      item.motherPhone ||
                      item.guardianPhone ||
                      "Not provided"
                    }
                  />
                  <Info
                    label="Submitted"
                    value={item.submittedAt.toLocaleString("en-IN")}
                  />
                </div>
                {item.address && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Address:
                    </span>{" "}
                    {item.address}
                    {item.city ? `, ${item.city}` : ""}
                  </p>
                )}
                {item.medicalConditions && (
                  <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    <span className="font-bold">Health note:</span>{" "}
                    {item.medicalConditions}
                  </p>
                )}
                {item.documents.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.documents.map((document) => (
                      <Button
                        key={document.id}
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a
                          href={`/api/v1/admissions/${item.id}/documents/${document.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText className="size-3.5" />
                          {label(document.type)}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="border-t bg-slate-50/60 p-5">
              <AdmissionReviewActions
                id={item.id}
                status={item.status}
                sections={item.applyingClass.sections}
                automaticNumbering={admissionSetting.automaticNumbering}
                nextAdmissionNo={`${admissionSetting.admissionPrefix}${String(admissionSetting.nextNumber).padStart(admissionSetting.numberPadding, "0")}`}
              />
              {item.history.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Recent history
                  </p>
                  <div className="mt-2 space-y-1">
                    {item.history.map((entry) => (
                      <p
                        key={entry.id}
                        className="text-xs text-muted-foreground"
                      >
                        {entry.createdAt.toLocaleString("en-IN")} ·{" "}
                        {label(entry.toStatus)} · {entry.changedBy}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
      {pages > 1 && (
        <nav className="flex items-center justify-between rounded-2xl border bg-card p-4 text-sm">
          <p>
            Page {page} of {pages} · {total} results
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(query, page - 1)}>Previous</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(query, page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </nav>
      )}
    </PageContainer>
  );
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function badgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  if (status === "CONVERTED" || status === "APPROVED") return "success";
  if (status === "REJECTED") return "destructive";
  if (status === "WAITLISTED") return "secondary";
  return "outline";
}
function Info({ label: title, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
function Stat({
  icon: Icon,
  label: title,
  value,
  tone,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  tone: "indigo" | "amber" | "emerald" | "violet";
}) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div
        className={`flex size-10 items-center justify-center rounded-xl ${styles[tone]}`}
      >
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );
}
function pageHref(
  query: { search?: string; status?: string; classId?: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.classId) params.set("classId", query.classId);
  params.set("page", String(page));
  return `?${params.toString()}`;
}
