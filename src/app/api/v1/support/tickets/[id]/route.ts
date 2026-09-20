import { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma/enums";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, visibleTicket } from "@/lib/support-tickets";

type Context = { params: Promise<{ id: string }> };
const updateInput = z.object({
  status: z.enum(SupportTicketStatus).optional(),
  priority: z.enum(SupportTicketPriority).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function GET(_request: Request, context: Context) {
  return apiHandler(async () => ApiResponse.success(await visibleTicket((await context.params).id, await supportActor())));
}

export async function PATCH(request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Only school admins can manage tickets.");
    const id = (await context.params).id;
    await visibleTicket(id, actor);
    const input = updateInput.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Invalid ticket update.");
    if (input.data.assignedToId) {
      const assignee = await prisma.membership.findFirst({
        where: { schoolId: actor.schoolId, userId: input.data.assignedToId, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
        select: { id: true },
      });
      if (!assignee) throw new ApiError(400, "Assignee is not active staff in this school.");
    }
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...input.data,
        resolvedAt: input.data.status === "RESOLVED" || input.data.status === "CLOSED"
          ? new Date()
          : input.data.status ? null : undefined,
      },
    });
    return ApiResponse.success(ticket);
  });
}
