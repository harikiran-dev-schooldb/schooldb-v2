import { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma/enums";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { assertSupportStatusTransition, supportActor } from "@/lib/support-tickets";
import { sendSupportPush } from "@/lib/support-push";

const inputSchema = z.object({
  ticketIds: z.array(z.string().min(1)).min(1).max(50),
  status: z.enum(SupportTicketStatus).optional(),
  priority: z.enum(SupportTicketPriority).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
}).refine((value) => value.status || value.priority || value.assignedToId !== undefined);

export async function POST(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    if (!actor.isAdmin) throw new ApiError(403, "Only school admins can update tickets in bulk.");
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Select tickets and one bulk action.");
    const ticketIds = [...new Set(parsed.data.ticketIds)];
    const tickets = await prisma.supportTicket.findMany({
      where: { id: { in: ticketIds }, schoolId: actor.schoolId },
      select: { id: true, ticketNo: true, status: true, priority: true, createdById: true, assignedToId: true },
    });
    if (tickets.length !== ticketIds.length) throw new ApiError(400, "One or more selected tickets are unavailable.");
    if (parsed.data.status) tickets.forEach((ticket) => assertSupportStatusTransition(ticket.status, parsed.data.status!));
    if (parsed.data.assignedToId) {
      const validAssignee = await prisma.membership.findFirst({
        where: { schoolId: actor.schoolId, userId: parsed.data.assignedToId, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
        select: { userId: true },
      });
      if (!validAssignee) throw new ApiError(400, "Assignee is not active staff in this school.");
    }
    const detail = parsed.data.status
      ? `Status changed to ${parsed.data.status}`
      : parsed.data.priority
        ? `Priority changed to ${parsed.data.priority}`
        : parsed.data.assignedToId ? "Ticket assigned in bulk" : "Ticket unassigned in bulk";
    await prisma.$transaction(async (tx) => {
      for (const ticket of tickets) {
        const nextStatus = parsed.data.status ??
          (parsed.data.assignedToId && ticket.status === "OPEN" ? SupportTicketStatus.ASSIGNED : undefined);
        await tx.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: nextStatus,
            priority: parsed.data.priority,
            assignedToId: parsed.data.assignedToId,
            resolvedAt: nextStatus
              ? nextStatus === "RESOLVED" || nextStatus === "CLOSED" ? new Date() : null
              : undefined,
          },
        });
        await tx.supportTicketActivity.create({
          data: { schoolId: actor.schoolId, ticketId: ticket.id, actorId: actor.userId, action: "BULK_UPDATED", detail },
        });
      }
    });
    await Promise.all(tickets.map((ticket) => sendSupportPush({
      schoolId: actor.schoolId,
      userIds: [ticket.createdById, parsed.data.assignedToId ?? ticket.assignedToId].filter((id): id is string => Boolean(id)),
      excludeUserId: actor.userId,
      title: `${ticket.ticketNo} updated`,
      body: detail,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
      eventKey: `BULK:${Date.now()}`,
      priority: parsed.data.priority ?? ticket.priority,
    }).catch((error) => console.error("Bulk support push failed", error))));
    return ApiResponse.success({ updated: tickets.length });
  });
}
