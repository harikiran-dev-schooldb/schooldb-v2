import { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma/enums";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor, visibleTicket } from "@/lib/support-tickets";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

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
    const current = await visibleTicket(id, actor);
    const input = updateInput.safeParse(await request.json());
    if (!input.success) throw new ApiError(400, "Invalid ticket update.");
    if (input.data.assignedToId) {
      const assignee = await prisma.membership.findFirst({
        where: { schoolId: actor.schoolId, userId: input.data.assignedToId, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
        select: { id: true },
      });
      if (!assignee) throw new ApiError(400, "Assignee is not active staff in this school.");
    }
    const changes: Array<{ action: string; detail: string }> = [];
    if (input.data.status && input.data.status !== current.status)
      changes.push({ action: "STATUS_CHANGED", detail: `Status changed from ${current.status} to ${input.data.status}` });
    if (input.data.priority && input.data.priority !== current.priority)
      changes.push({ action: "PRIORITY_CHANGED", detail: `Priority changed from ${current.priority} to ${input.data.priority}` });
    if (input.data.assignedToId !== undefined && input.data.assignedToId !== current.assignedToId) {
      const assigneeName = input.data.assignedToId
        ? await prisma.user.findUnique({ where: { id: input.data.assignedToId }, select: { firstName: true, lastName: true } })
        : null;
      const name = assigneeName ? [assigneeName.firstName, assigneeName.lastName].filter(Boolean).join(" ") || "staff member" : "Unassigned";
      changes.push({ action: "ASSIGNMENT_CHANGED", detail: input.data.assignedToId ? `Assigned to ${name}` : "Ticket unassigned" });
    }
    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          ...input.data,
          resolvedAt: input.data.status === "RESOLVED" || input.data.status === "CLOSED"
            ? new Date()
            : input.data.status ? null : undefined,
        },
      });
      if (changes.length) await tx.supportTicketActivity.createMany({
        data: changes.map((change) => ({
          schoolId: actor.schoolId, ticketId: id, actorId: actor.userId,
          action: change.action, detail: change.detail,
        })),
      });
      return updated;
    });
    const recipients = new Set<string>([current.createdById]);
    if (ticket.assignedToId) recipients.add(ticket.assignedToId);
    if (input.data.priority === "URGENT" && current.priority !== "URGENT") {
      (await supportAdminUserIds(actor.schoolId)).forEach((id) => recipients.add(id));
    }
    const notificationDetail = changes.at(-1)?.detail;
    if (notificationDetail) {
      await sendSupportPush({
        schoolId: actor.schoolId,
        userIds: [...recipients],
        excludeUserId: actor.userId,
        title: `${current.ticketNo} updated`,
        body: notificationDetail,
        ticketId: current.id,
        ticketNo: current.ticketNo,
      }).catch((error) => console.error("Support push failed", error));
    }

    return ApiResponse.success(ticket);
  });
}
