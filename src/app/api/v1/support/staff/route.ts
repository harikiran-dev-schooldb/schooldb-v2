import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor } from "@/lib/support-tickets";

export async function GET() {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Only school admins can assign tickets.");
    const staff = await prisma.membership.findMany({
      where: { schoolId: actor.schoolId, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
      select: { userId: true, role: true, user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { user: { firstName: "asc" } },
    });
    return ApiResponse.success(staff.map((member) => ({
      id: member.userId,
      name: [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email,
      role: member.role,
    })));
  });
}
