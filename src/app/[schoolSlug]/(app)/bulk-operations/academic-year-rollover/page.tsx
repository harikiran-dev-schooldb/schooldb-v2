import { PageHeader } from "@/components/common/PageHeader";
import { AcademicYearRollover } from "@/features/bulk/AcademicYearRollover";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RolloverPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params; const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const years = await prisma.academicYear.findMany({ where: { schoolId: member.schoolId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, active: true } });
  return <div className="space-y-6 p-4 pb-12 sm:p-6"><PageHeader eyebrow="Bulk operations" title="Academic-year rollover" description="Safely copy reusable academic setup into a new year, with preview and duplicate protection." /><AcademicYearRollover years={years} /></div>;
}
