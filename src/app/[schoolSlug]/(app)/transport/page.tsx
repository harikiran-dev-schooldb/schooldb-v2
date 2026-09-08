import { PageContainer, PageHeader } from "@/components/common/layout";
import { TransportManager, type TransportDashboardData } from "@/features/transport/TransportManager";
import { listTransportDashboard } from "@/features/transport/service";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TransportPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const [dashboard, academicYear] = await Promise.all([
    listTransportDashboard(membership.schoolId),
    prisma.academicYear.findFirst({
      where: { schoolId: membership.schoolId, active: true },
      orderBy: { startDate: "desc" },
      select: { id: true },
    }),
  ]);

  const data: TransportDashboardData = {
    vehicles: dashboard.vehicles,
    routes: dashboard.routes.map((route) => ({
      ...route,
      stops: route.stops.map((stop) => ({
        ...stop,
        monthlyFee: stop.monthlyFee?.toString() ?? null,
      })),
    })),
    assignments: dashboard.assignments.map((assignment) => ({
      ...assignment,
      startDate: assignment.startDate.toISOString(),
    })),
  };

  return (
    <PageContainer>
      <PageHeader title="Transport management" description="Manage the school fleet, routes, boarding stops and student travel assignments." />
      <TransportManager
        key={`${data.vehicles.length}-${data.routes.length}-${data.assignments.length}`}
        data={data}
        academicYearId={academicYear?.id ?? null}
      />
    </PageContainer>
  );
}
