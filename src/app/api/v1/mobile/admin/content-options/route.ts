import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const syllabi = await prisma.syllabus.findMany({
      where: { schoolId: membership.schoolId, active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        branches: {
          where: { active: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            classes: {
              where: { active: true },
              orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
              select: {
                id: true,
                name: true,
                sections: {
                  where: { active: true },
                  orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    return ApiResponse.success({ syllabi });
  });
}
