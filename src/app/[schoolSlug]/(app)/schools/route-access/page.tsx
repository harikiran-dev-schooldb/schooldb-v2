import { SchoolRouteAccessManager } from "@/features/schools/SchoolRouteAccessManager";
import { requireRole } from "@/lib/auth";

export default async function SchoolRouteAccessPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireRole(["SUPER_ADMIN"], schoolSlug);

  return <SchoolRouteAccessManager />;
}
