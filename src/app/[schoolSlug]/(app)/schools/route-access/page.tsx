import { SchoolAdministration } from "@/features/schools/SchoolAdministration";
import { SchoolRouteAccessManager } from "@/features/schools/SchoolRouteAccessManager";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";

export default async function SchoolRouteAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ schoolId?: string | string[] }>;
}) {
  const { schoolSlug } = await params;
  const actor = await requireRole(["SUPER_ADMIN"], schoolSlug);
  if (actor.role !== "SUPER_ADMIN") throw new ApiError(403, "Super administrator required.");
  const { schoolId } = await searchParams;
  const targetSchoolId = typeof schoolId === "string" ? schoolId : schoolId ? "" : undefined;

  if (targetSchoolId !== undefined) return <SchoolAdministration key={targetSchoolId} schoolId={targetSchoolId} schoolSlug={schoolSlug} />;

  return <SchoolRouteAccessManager key={targetSchoolId ?? "all"} targetSchoolId={targetSchoolId} schoolSlug={schoolSlug} />;
}
