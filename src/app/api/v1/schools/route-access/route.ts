import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { normalizeAllowedRoutes } from "@/lib/route-access";

export async function GET() {
  return apiHandler(async () => {
    await requireRole(["SUPER_ADMIN"]);

    const schools = await prisma.school.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        routeAccessRestricted: true,
        allowedRoutes: true,
      },
    });

    return ApiResponse.success({ schools });
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const body = await request.json();
    const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
    const routeAccessRestricted = body.routeAccessRestricted === true;

    if (!schoolId) throw new Error("Select a school.");

    const school = await prisma.school.update({
      where: { id: schoolId },
      data: {
        routeAccessRestricted,
        allowedRoutes: routeAccessRestricted
          ? normalizeAllowedRoutes(body.allowedRoutes)
          : [],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        routeAccessRestricted: true,
        allowedRoutes: true,
      },
    });

    return ApiResponse.success(
      { school },
      `Route access updated for ${school.name}.`,
    );
  });
}
