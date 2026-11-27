import { CalendarRange, CircleGauge, Globe2, ShieldCheck } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { AdmissionHero, AdmissionMetric } from "@/features/admissions/AdmissionSurface";
import { AdmissionAgeSettings } from "@/features/admissions/AdmissionAgeSettings";
import { AdmissionReminderSetting } from "@/features/admissions/AdmissionLifecycleControls";
import { AdmissionNumberSettings } from "@/features/admissions/AdmissionNumberSettings";
import { PublicEnquirySetting } from "@/features/admissions/AdmissionPlanningEditor";
import { AdmissionYearSettings } from "@/features/admissions/AdmissionYearSettings";
import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export default async function Page({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(actor.role)) throw new ApiError(403, "Administrator required.");
  const [options, setting, allYears] = await Promise.all([
    admissionWorkspaceOptions(actor.schoolId),
    prisma.schoolAdmissionSetting.findUnique({ where: { schoolId: actor.schoolId } }),
    prisma.academicYear.findMany({ where: { schoolId: actor.schoolId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, active: true, admissionsEnabled: true } }),
  ]);
  const enabledYears = allYears.filter((year) => year.admissionsEnabled).length;
  const activePolicy = options.years[0]?.policy;
  const ageRules = activePolicy ? Object.keys(activePolicy.rules).length : 0;
  const publicYears = options.years.filter((year) => year.publicEnabled).length;

  return <PageContainer>
    <PageHeader title="Admission Settings" description={`${actor.school.name} · Approved school-specific controls`} />
    <AdmissionHero eyebrow="Admissions governance" title="Control intake with confidence" description="Keep academic years, eligibility, admission numbers, public enquiries, and reminders aligned from one secure settings workspace." />
    <section aria-label="Settings overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdmissionMetric icon={CalendarRange} label="Enabled years" value={enabledYears} helper={`${allYears.length} academic years available`} tone={enabledYears ? "success" : "warning"} />
      <AdmissionMetric icon={CircleGauge} label="Age rules" value={ageRules} helper="Classes configured in the latest year" tone={ageRules ? "success" : "warning"} />
      <AdmissionMetric icon={Globe2} label="Public portals" value={publicYears} helper="Admission years accepting enquiries" tone={publicYears ? "success" : "primary"} />
      <AdmissionMetric icon={ShieldCheck} label="Numbering" value={setting?.automaticNumbering ? "Automatic" : "Manual"} helper={setting?.automaticNumbering ? "Protected sequential numbers" : "Staff enters admission numbers"} tone={setting?.automaticNumbering ? "success" : "primary"} />
    </section>
    <AdmissionYearSettings years={allYears} />
    <AdmissionAgeSettings key={options.years.map((year) => year.id).join(":")} {...options} />
    <AdmissionNumberSettings initial={{ automaticNumbering: setting?.automaticNumbering ?? false, admissionPrefix: setting?.admissionPrefix ?? "", nextNumber: setting?.nextNumber ?? 1, numberPadding: setting?.numberPadding ?? 4 }} />
    <PublicEnquirySetting years={options.years} />
    <AdmissionReminderSetting enabled={setting?.admissionRemindersEnabled ?? false} />
  </PageContainer>;
}
