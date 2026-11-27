import { Calculator, CalendarCheck2, ChartNoAxesCombined, ClipboardCheck, FileText, Inbox, IndianRupee, Settings2, Target, UserRoundCheck, UsersRound } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { AdmissionAction, AdmissionHero, AdmissionMetric } from "@/features/admissions/AdmissionSurface";
import { AdmissionSelect } from "@/features/admissions/AdmissionWorkspaceUI";
import { isMemberRouteAllowed } from "@/lib/navigation-access";
import { prisma } from "@/lib/prisma";
import { isRouteAllowed } from "@/lib/route-access";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const actions = [
  { title: "Smart Pipeline", route: "admissions/pipeline", icon: ChartNoAxesCombined, description: "Move applications through every stage." },
  { title: "Enquiries", route: "admissions/intake", icon: Inbox, description: "Capture interest and parent conversations." },
  { title: "Applications", route: "admissions", icon: FileText, description: "Review, approve and enroll applicants." },
  { title: "Age Calculator", route: "admissions/age-calculator", icon: Calculator, description: "Check exact age and eligible classes." },
  { title: "Fee Structure", route: "admissions/fees", icon: IndianRupee, description: "Publish clear class-wise admission quotes." },
  { title: "Entrance & Interviews", route: "admissions/reviews", icon: ClipboardCheck, description: "Record entrance and interview decisions." },
  { title: "Parent Follow-ups", route: "admissions/follow-ups", icon: UsersRound, description: "Keep every parent contact accountable." },
  { title: "Seat Capacity", route: "admissions/planning", icon: Target, description: "Plan targets and monitor availability." },
  { title: "Setup Checklist", route: "admissions/setup", icon: CalendarCheck2, description: "Confirm readiness before opening intake." },
  { title: "Admission Settings", route: "admissions/settings", icon: Settings2, description: "Control years, age rules and numbering." },
] as const;

export default async function Page({ params, searchParams }: { params: Promise<{ schoolSlug: string }>; searchParams: Promise<{ year?: string }> }) {
  const { schoolSlug } = await params;
  const query = await searchParams;
  const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"], schoolSlug);
  const admin = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(actor.role);
  const years = await prisma.academicYear.findMany({ where: { schoolId: actor.schoolId, admissionsEnabled: true }, orderBy: { startDate: "desc" }, select: { id: true, name: true } });
  const year = years.find((item) => item.id === query.year) ?? years[0];
  const visibleActions = actions.filter((item) => isRouteAllowed(actor.school, item.route) && isMemberRouteAllowed(actor, item.route) && (!["admissions/planning", "admissions/settings", "admissions/setup"].includes(item.route) || admin));
  const scope = { schoolId: actor.schoolId, academicYearId: year?.id ?? "" };
  const counts = admin && year ? await Promise.all([
    prisma.admissionEnquiry.count({ where: { ...scope, state: { in: ["OPEN", "LINKED"] } } }),
    prisma.admissionApplication.count({ where: scope }),
    prisma.admissionApplication.count({ where: { ...scope, status: "CONVERTED" } }),
    prisma.admissionApplication.count({ where: { ...scope, status: { in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"] } } }),
  ]) : null;

  return <PageContainer>
    <PageHeader title="Admissions dashboard" description={`${actor.school.name} · Complete intake command centre`} />
    <AdmissionHero title="Make every admission journey feel effortless" description="Move from first parent enquiry to enrollment with clear ownership, consistent decisions, and a complete audit trail." aside={year ? <form className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-md"><div className="flex min-w-64 gap-2"><AdmissionSelect key={year.id} name="year" label="Academic year" defaultValue={year.id} options={years} /><Button type="submit" className="h-11">Apply</Button></div></form> : null} />
    {!year ? <div className="premium-card rounded-2xl border-dashed p-8 text-center"><p className="font-semibold">No admissions year enabled</p><p className="mt-1 text-sm text-muted-foreground">Ask an administrator to enable a year in Admission Settings.</p></div> : null}
    {counts ? <section aria-label="Admissions summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdmissionMetric icon={Inbox} label="Active enquiries" value={counts[0]} helper="Parents currently in the funnel" />
      <AdmissionMetric icon={FileText} label="Applications" value={counts[1]} helper={`Recorded for ${year?.name}`} />
      <AdmissionMetric icon={UserRoundCheck} label="Enrolled" value={counts[2]} helper="Successfully converted students" tone="success" />
      <AdmissionMetric icon={ClipboardCheck} label="Needs review" value={counts[3]} helper="Submitted, reviewing or waitlisted" tone={counts[3] ? "warning" : "success"} />
    </section> : null}
    <section><div className="mb-4"><p className="section-label">Admission operations</p><h2 className="mt-1 text-xl font-black tracking-tight">Choose your next action</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{visibleActions.map((item) => <AdmissionAction key={item.route} href={`/${schoolSlug}/${item.route}${year ? `?year=${encodeURIComponent(year.id)}` : ""}`} icon={item.icon} title={item.title} description={item.description} />)}</div></section>
  </PageContainer>;
}
