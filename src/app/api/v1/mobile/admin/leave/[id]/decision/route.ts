import { z } from "zod";

import { notifyLeaveRequestDecided } from "@/features/notifications/events";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().min(3).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const input = await validateBody(request, decisionSchema);

    const updated = await prisma.leaveRequest.updateMany({
      where: {
        id,
        schoolId: membership.schoolId,
        status: "PENDING",
      },
      data: {
        status: input.decision,
        decisionNote: input.decisionNote,
        decidedBy: membership.userId,
        decidedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      const exists = await prisma.leaveRequest.findFirst({
        where: { id, schoolId: membership.schoolId },
        select: { id: true },
      });
      throw new ApiError(exists ? 409 : 404, exists
        ? "This leave request has already been decided."
        : "Leave request not found.");
    }

    await notifyLeaveRequestDecided(id, membership.schoolId).catch((error) => {
      console.error("Unable to create leave decision notification", error);
    });

    return ApiResponse.success({ id, status: input.decision }, `Leave request ${input.decision.toLowerCase()}.`);
  });
}
