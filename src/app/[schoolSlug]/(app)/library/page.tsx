import { PageContainer, PageHeader } from "@/components/common/layout";
import { LibraryManager, type LibraryData } from "@/features/library/LibraryManager";
import { listLibraryDashboard } from "@/features/library/service";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LibraryPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params; const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const [dashboard, academicYear, teachers] = await Promise.all([listLibraryDashboard(membership.schoolId), prisma.academicYear.findFirst({ where: { schoolId: membership.schoolId, active: true }, orderBy: { startDate: "desc" }, select: { id: true } }), prisma.teacher.findMany({ where: { schoolId: membership.schoolId, active: true }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, employeeId: true } })]);
  const data: LibraryData = { ...dashboard, loans: dashboard.loans.map((loan) => ({ ...loan, issuedAt: loan.issuedAt.toISOString(), dueAt: loan.dueAt.toISOString(), returnedAt: loan.returnedAt?.toISOString() ?? null, fineAmount: loan.fineAmount.toString() })) };
  return <PageContainer><PageHeader title="Library management" description="Manage the catalog, physical copies, borrowing, returns, renewals and overdue books." /><LibraryManager key={`${data.books.length}-${data.loans.length}`} data={data} academicYearId={academicYear?.id ?? null} teachers={teachers} /></PageContainer>;
}
