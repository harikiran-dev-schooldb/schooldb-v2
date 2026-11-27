import { writeAuditLog } from "@/lib/audit";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { ApiError } from "@/lib/errors";
import { normalizeAllowedRoutes,validLandingRoute } from "@/lib/route-access";

export async function GET() {
  return apiHandler(async () => {
    const actor=await requireRole(["SUPER_ADMIN"]);
    if(actor.role!=="SUPER_ADMIN")throw new ApiError(403,"Super administrator required.");

    const schools = await prisma.school.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        routeAccessRestricted: true,
        allowedRoutes: true,
        defaultLandingRoute: true,
        moduleAccessRestricted: true,
      },
    });

    return ApiResponse.success({ schools });
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const actor=await requireRole(["SUPER_ADMIN"]);
    if(actor.role!=="SUPER_ADMIN")throw new ApiError(403,"Super administrator required.");
    const body = await request.json();
    const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
    const routeAccessRestricted = body.routeAccessRestricted === true;

    if (!schoolId) throw new Error("Select a school.");

    const allowedRoutes=routeAccessRestricted?normalizeAllowedRoutes(body.allowedRoutes):[];
    const defaultLandingRoute=validLandingRoute({routeAccessRestricted,allowedRoutes},body.defaultLandingRoute);
    if(body.defaultLandingRoute&&!defaultLandingRoute)throw new ApiError(400,"Choose an enabled landing page.");
    const school = await prisma.$transaction(async (tx) => {
      const updated = await tx.school.update({
      where: { id: schoolId },
      data: {
        routeAccessRestricted,
        allowedRoutes,
        defaultLandingRoute,
        moduleAccessRestricted:routeAccessRestricted&&body.moduleAccessRestricted===true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        routeAccessRestricted: true,
        allowedRoutes: true,
        defaultLandingRoute: true,
        moduleAccessRestricted: true,
      },
      });
      await writeAuditLog(tx, { actor: { ...actor, schoolId: updated.id }, module: "SYSTEM", action: "UPDATE", entityType: "SchoolConfiguration", entityId: updated.id, summary: "Updated school modules and route access", metadata: { routeAccessRestricted, allowedRoutes, defaultLandingRoute, moduleAccessRestricted: updated.moduleAccessRestricted } });
      return updated;
    });

    return ApiResponse.success(
      { school },
      `Route access updated for ${school.name}.`,
    );
  });
}
