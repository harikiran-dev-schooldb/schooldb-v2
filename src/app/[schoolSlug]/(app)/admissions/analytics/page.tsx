import { BarChart3, Download, FileCheck2, Inbox, Sparkles, TrendingUp, UserRoundCheck } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { AdmissionPanel, AdmissionSelect } from "@/features/admissions/AdmissionWorkspaceUI";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const sourceNames: Record<string, string> = {
  WALK_IN: "Walk-in",
  WEBSITE: "Website",
  PHONE: "Phone",
  REFERRAL: "Referral",
  CAMPAIGN: "Campaign",
  OTHER: "Other",
};

function StatCard({ label, value, helper, icon: Icon, tone = "primary" }: { label: string; value: string | number; helper: string; icon: typeof Inbox; tone?: "primary" | "success" | "warning" }) {
  const iconTone = tone === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : tone === "warning" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary";
  return <article className="premium-card rounded-2xl p-4 sm:p-5">
    <div className={`grid size-10 place-items-center rounded-xl ${iconTone}`}><Icon className="size-5" /></div>
    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-3xl font-black tracking-tight tabular-nums">{value}</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
  </article>;
}

export default async function Page({ params, searchParams }: { params: Promise<{ schoolSlug: string }>; searchParams: Promise<{ year?: string }> }) {
  const { schoolSlug } = await params;
  const query = await searchParams;
  const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(actor.role)) throw new ApiError(403, "Administrator required.");
  const years = await prisma.academicYear.findMany({ where: { schoolId: actor.schoolId, admissionsEnabled: true }, orderBy: { startDate: "desc" }, select: { id: true, name: true } });
  const year = years.find((item) => item.id === query.year) ?? years[0];
  if (!year) return <PageContainer><PageHeader title="Admissions Analytics" description="No academic year enabled for admissions." /></PageContainer>;
  const scope = { schoolId: actor.schoolId, academicYearId: year.id };
  const [enquiries, applications, classes, sources] = await Promise.all([
    prisma.admissionEnquiry.groupBy({ by: ["state"], where: scope, _count: { _all: true } }),
    prisma.admissionApplication.groupBy({ by: ["status", "applyingClassId"], where: scope, _count: { _all: true } }),
    prisma.class.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true }, orderBy: { displayOrder: "asc" } }),
    prisma.admissionEnquiry.groupBy({ by: ["source"], where: { ...scope, state: { in: ["OPEN", "LINKED", "CLOSED"] } }, _count: { _all: true } }),
  ]);
  const total = applications.reduce((sum, item) => sum + item._count._all, 0);
  const converted = applications.filter((item) => item.status === "CONVERTED").reduce((sum, item) => sum + item._count._all, 0);
  const accepted = enquiries.filter((item) => ["OPEN", "LINKED", "CLOSED"].includes(item.state)).reduce((sum, item) => sum + item._count._all, 0);
  const conversion = total ? Math.round(converted / total * 100) : 0;
  const sourceTotal = sources.reduce((sum, item) => sum + item._count._all, 0);

  return <PageContainer>
    <PageHeader title="Admissions Analytics" description={`${actor.school.name} · ${year.name} admission performance`} />
    <section className="premium-hero relative overflow-hidden rounded-3xl border border-primary/15 p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><BarChart3 className="size-6" /></div><p className="section-label mt-4">Admissions intelligence</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Turn the funnel into confident decisions</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">See where parent interest becomes applications, which classes convert, and which enquiry sources bring the strongest demand.</p></div>
        <form className="flex w-full flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 p-3 backdrop-blur-md sm:w-auto sm:min-w-80 sm:flex-row"><div className="min-w-52 flex-1"><AdmissionSelect key={year.id} name="year" label="Academic year" defaultValue={year.id} options={years} /></div><Button type="submit" className="h-11">Apply</Button></form>
      </div>
    </section>
    <section aria-label="Admissions overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Enquiries" value={accepted} helper="Parents in the active funnel" icon={Inbox} />
      <StatCard label="Applications" value={total} helper={`${accepted ? Math.round(total / accepted * 100) : 0}% of enquiries applied`} icon={FileCheck2} />
      <StatCard label="Converted" value={converted} helper="Students successfully enrolled" icon={UserRoundCheck} tone="success" />
      <StatCard label="Conversion rate" value={`${conversion}%`} helper={conversion >= 60 ? "Healthy application conversion" : "Opportunity to improve follow-up"} icon={TrendingUp} tone={conversion >= 60 ? "success" : "warning"} />
    </section>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <AdmissionPanel title="Class-wise conversion" description="Converted students compared with all applications">
        <div className="space-y-5">{classes.map((item) => { const rows = applications.filter((row) => row.applyingClassId === item.id); const count = rows.reduce((sum, row) => sum + row._count._all, 0); const done = rows.filter((row) => row.status === "CONVERTED").reduce((sum, row) => sum + row._count._all, 0); const rate = count ? Math.round(done / count * 100) : 0; return <div key={item.id}>
          <div className="mb-2 flex items-end justify-between gap-3"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{done} converted from {count} applications</p></div><span className="text-sm font-black tabular-nums">{rate}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-[width]" style={{ width: `${rate}%` }} /></div>
        </div>; })}</div>
      </AdmissionPanel>
      <AdmissionPanel title="Enquiry sources" description="Where parent interest begins">
        <div className="space-y-3">{sources.length ? sources.sort((a, b) => b._count._all - a._count._all).map((item) => { const share = sourceTotal ? Math.round(item._count._all / sourceTotal * 100) : 0; return <div key={item.source} className="rounded-2xl border border-border/60 bg-muted/15 p-3"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{sourceNames[item.source] ?? item.source.replaceAll("_", " ")}</span><span className="font-black tabular-nums">{item._count._all}</span></div><p className="mt-1 text-xs text-muted-foreground">{share}% of all enquiries</p></div>; }) : <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Sparkles className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Source insights appear after enquiries arrive.</p></div>}</div>
      </AdmissionPanel>
    </div>
    <div className="flex justify-end"><Button asChild variant="outline" className="rounded-xl"><a href={`/api/v1/admissions/report?year=${encodeURIComponent(year.id)}`}><Download className="size-4" />Export applications CSV</a></Button></div>
  </PageContainer>;
}
